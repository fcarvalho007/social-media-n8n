-- Adicionar políticas RLS permissivas para acesso público aos projetos

-- Políticas para a tabela projects
CREATE POLICY "public_read_projects" ON projects
FOR SELECT USING (true);

CREATE POLICY "public_update_projects" ON projects
FOR UPDATE USING (true);

CREATE POLICY "public_delete_projects" ON projects
FOR DELETE USING (true);

CREATE POLICY "public_insert_projects" ON projects
FOR INSERT WITH CHECK (true);

-- Políticas para a tabela tasks
CREATE POLICY "public_read_tasks" ON tasks
FOR SELECT USING (true);

CREATE POLICY "public_update_tasks" ON tasks
FOR UPDATE USING (true);

CREATE POLICY "public_delete_tasks" ON tasks
FOR DELETE USING (true);

CREATE POLICY "public_insert_tasks" ON tasks
FOR INSERT WITH CHECK (true);

-- Políticas para a tabela milestones
CREATE POLICY "public_read_milestones" ON milestones
FOR SELECT USING (true);

CREATE POLICY "public_update_milestones" ON milestones
FOR UPDATE USING (true);

CREATE POLICY "public_delete_milestones" ON milestones
FOR DELETE USING (true);

CREATE POLICY "public_insert_milestones" ON milestones
FOR INSERT WITH CHECK (true);

-- Políticas para a tabela task_dependencies
CREATE POLICY "public_read_task_dependencies" ON task_dependencies
FOR SELECT USING (true);

CREATE POLICY "public_update_task_dependencies" ON task_dependencies
FOR UPDATE USING (true);

CREATE POLICY "public_delete_task_dependencies" ON task_dependencies
FOR DELETE USING (true);

CREATE POLICY "public_insert_task_dependencies" ON task_dependencies
FOR INSERT WITH CHECK (true);

-- Políticas para a tabela task_milestones
CREATE POLICY "public_read_task_milestones" ON task_milestones
FOR SELECT USING (true);

CREATE POLICY "public_update_task_milestones" ON task_milestones
FOR UPDATE USING (true);

CREATE POLICY "public_delete_task_milestones" ON task_milestones
FOR DELETE USING (true);

CREATE POLICY "public_insert_task_milestones" ON task_milestones
FOR INSERT WITH CHECK (true);