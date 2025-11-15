import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Check tasks due tomorrow
    const { data: tasksDueTomorrow } = await supabaseClient
      .from('tasks')
      .select('*, projects(name, owner_id)')
      .eq('status', 'todo')
      .gte('due_date', tomorrow.toISOString().split('T')[0])
      .lt('due_date', new Date(tomorrow.getTime() + 86400000).toISOString().split('T')[0]);

    // Check overdue tasks
    const { data: overdueTasks } = await supabaseClient
      .from('tasks')
      .select('*, projects(name, owner_id)')
      .neq('status', 'done')
      .lt('due_date', today.toISOString().split('T')[0]);

    // Check milestones due this week
    const { data: milestonesDueThisWeek } = await supabaseClient
      .from('milestones')
      .select('*, projects(name, owner_id)')
      .neq('status', 'completed')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', nextWeek.toISOString().split('T')[0]);

    // Create notifications for tasks due tomorrow
    if (tasksDueTomorrow && tasksDueTomorrow.length > 0) {
      for (const task of tasksDueTomorrow) {
        const projectOwner = task.projects?.owner_id;
        
        if (projectOwner) {
          await supabaseClient.from('notifications').insert({
            user_id: projectOwner,
            title: 'Tarefa com deadline amanhã',
            message: `A tarefa "${task.title}" no projeto "${task.projects.name}" tem deadline amanhã`,
            type: 'deadline',
            related_entity_type: 'task',
            related_entity_id: task.id,
          });
        }

        // Notify assignee if different from owner
        if (task.assignee_id && task.assignee_id !== projectOwner) {
          await supabaseClient.from('notifications').insert({
            user_id: task.assignee_id,
            title: 'Tarefa atribuída com deadline amanhã',
            message: `A tarefa "${task.title}" que te foi atribuída tem deadline amanhã`,
            type: 'deadline',
            related_entity_type: 'task',
            related_entity_id: task.id,
          });
        }
      }
    }

    // Create notifications for overdue tasks
    if (overdueTasks && overdueTasks.length > 0) {
      for (const task of overdueTasks) {
        const projectOwner = task.projects?.owner_id;
        
        if (projectOwner) {
          await supabaseClient.from('notifications').insert({
            user_id: projectOwner,
            title: 'Tarefa atrasada',
            message: `A tarefa "${task.title}" no projeto "${task.projects.name}" está atrasada`,
            type: 'error',
            related_entity_type: 'task',
            related_entity_id: task.id,
          });
        }

        if (task.assignee_id && task.assignee_id !== projectOwner) {
          await supabaseClient.from('notifications').insert({
            user_id: task.assignee_id,
            title: 'Tarefa atribuída atrasada',
            message: `A tarefa "${task.title}" que te foi atribuída está atrasada`,
            type: 'error',
            related_entity_type: 'task',
            related_entity_id: task.id,
          });
        }
      }
    }

    // Create notifications for milestones due this week
    if (milestonesDueThisWeek && milestonesDueThisWeek.length > 0) {
      for (const milestone of milestonesDueThisWeek) {
        const projectOwner = milestone.projects?.owner_id;
        
        if (projectOwner) {
          await supabaseClient.from('notifications').insert({
            user_id: projectOwner,
            title: 'Milestone próximo',
            message: `O milestone "${milestone.title}" no projeto "${milestone.projects.name}" é esta semana`,
            type: 'warning',
            related_entity_type: 'milestone',
            related_entity_id: milestone.id,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: {
          tasksDueTomorrow: tasksDueTomorrow?.length || 0,
          overdueTasks: overdueTasks?.length || 0,
          milestonesDueThisWeek: milestonesDueThisWeek?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Error checking deadlines:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
