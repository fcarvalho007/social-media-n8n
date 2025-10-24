import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SocialNetwork, PostType, MediaItem, PostStatus } from '@/types/social';
import { validatePost } from '@/lib/socialNetworks';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ModeBadge } from '@/components/ModeBadge';
import { DevHelper } from '@/components/DevHelper';
import { ProfileSelector } from '@/components/manual-post/ProfileSelector';
import { PostTypeSelector } from '@/components/manual-post/PostTypeSelector';
import { MediaManager } from '@/components/manual-post/MediaManager';
import { CaptionInput } from '@/components/manual-post/CaptionInput';
import { FirstCommentInput } from '@/components/manual-post/FirstCommentInput';
import { AltTextManager } from '@/components/manual-post/AltTextManager';
import { DateTimePicker } from '@/components/manual-post/DateTimePicker';
import { NetworkPreview } from '@/components/manual-post/NetworkPreview';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Send, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';

export default function ManualCreate() {
  const navigate = useNavigate();
  const [selectedNetworks, setSelectedNetworks] = useState<SocialNetwork[]>([]);
  const [postType, setPostType] = useState<PostType>('carousel');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduleAsap, setScheduleAsap] = useState(false);
  const [saving, setSaving] = useState(false);

  // Compute validations in real-time
  const validations = validatePost(caption, firstComment, mediaItems, selectedNetworks);
  const hasErrors = Object.values(validations).some(v => v.errors.length > 0);

  const handleAltTextChange = (mediaId: string, text: string) => {
    setAltTexts(prev => ({ ...prev, [mediaId]: text }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: postType,
          selected_networks: selectedNetworks,
          media_items: mediaItems as any,
          caption,
          first_comment: firstComment || null,
          alt_texts: altTexts as any,
          scheduled_date: scheduledDate?.toISOString() || null,
          schedule_asap: scheduleAsap,
          status: 'draft',
          network_validations: validations as any,
          origin_mode: 'manual',
          tema: 'Manual post',
          template_a_images: [],
          template_b_images: [],
          workflow_id: 'manual-' + Date.now(),
        });

      if (error) throw error;

      toast.success('Draft saved.');
      navigate('/?tab=approve');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (selectedNetworks.length === 0) {
      toast.error('Select at least one profile.');
      return;
    }

    if (hasErrors) {
      toast.error('Fix validation errors before submitting');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: postType,
          selected_networks: selectedNetworks,
          media_items: mediaItems as any,
          caption,
          first_comment: firstComment || null,
          alt_texts: altTexts as any,
          scheduled_date: scheduledDate?.toISOString() || null,
          schedule_asap: scheduleAsap,
          status: 'waiting_for_approval',
          network_validations: validations as any,
          origin_mode: 'manual',
          tema: 'Manual post',
          template_a_images: [],
          template_b_images: [],
          workflow_id: 'manual-' + Date.now(),
        });

      if (error) throw error;

      toast.success('Post submitted for approval');
      navigate('/?tab=approve');
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Failed to submit for approval');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulePost = async () => {
    if (selectedNetworks.length === 0) {
      toast.error('Select at least one profile.');
      return;
    }

    if (!scheduleAsap && !scheduledDate) {
      toast.error('Select a date and time');
      return;
    }

    if (hasErrors) {
      toast.error('Fix validation errors before scheduling');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: postType,
          selected_networks: selectedNetworks,
          media_items: mediaItems as any,
          caption,
          first_comment: firstComment || null,
          alt_texts: altTexts as any,
          scheduled_date: scheduledDate?.toISOString() || null,
          schedule_asap: scheduleAsap,
          status: 'scheduled',
          network_validations: validations as any,
          origin_mode: 'manual',
          tema: 'Manual post',
          template_a_images: [],
          template_b_images: [],
          workflow_id: 'manual-' + Date.now(),
        });

      if (error) throw error;

      const scheduleMsg = scheduleAsap 
        ? 'Post scheduled for immediate publishing'
        : `Post scheduled for ${scheduledDate?.toLocaleDateString()} at ${scheduledDate?.toLocaleTimeString()}`;
      
      toast.success(scheduleMsg);
      navigate('/calendar');
    } catch (error) {
      console.error('Error scheduling:', error);
      toast.error('Failed to schedule post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header with back button and mode badge */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/?tab=create')}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <ModeBadge 
                  mode="manual"
                  onChangeMode={() => navigate('/?tab=create')}
                  className="flex-1"
                />
              </div>

              {/* Two-column layout */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left Column - Master Settings */}
                <div className="space-y-6">
                  <ProfileSelector
                    selectedNetworks={selectedNetworks}
                    onNetworksChange={setSelectedNetworks}
                  />

                  <PostTypeSelector
                    postType={postType}
                    onPostTypeChange={setPostType}
                  />

                  <MediaManager
                    mediaItems={mediaItems}
                    onMediaChange={setMediaItems}
                    maxItems={10}
                  />

                  <CaptionInput
                    caption={caption}
                    onCaptionChange={setCaption}
                    selectedNetworks={selectedNetworks}
                  />

                  <FirstCommentInput
                    firstComment={firstComment}
                    onFirstCommentChange={setFirstComment}
                    selectedNetworks={selectedNetworks}
                  />

                  <AltTextManager
                    mediaItems={mediaItems}
                    altTexts={altTexts}
                    onAltTextChange={handleAltTextChange}
                  />

                  <DateTimePicker
                    scheduledDate={scheduledDate}
                    onScheduledDateChange={setScheduledDate}
                    scheduleAsap={scheduleAsap}
                    onScheduleAsapChange={setScheduleAsap}
                  />

                  {/* Actions */}
                  <div className="flex flex-col gap-3 sticky bottom-4 bg-card/95 backdrop-blur-sm p-4 rounded-xl border-2 border-border shadow-lg">
                    <Button
                      size="lg"
                      onClick={handleSchedulePost}
                      disabled={saving || hasErrors}
                      className="w-full h-12 font-bold"
                    >
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Schedule post
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="h-11 font-semibold"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save draft
                      </Button>
                      <Button
                        size="lg"
                        variant="secondary"
                        onClick={handleSubmitForApproval}
                        disabled={saving || hasErrors}
                        className="h-11 font-semibold"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit for approval
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/calendar')}
                      className="text-xs"
                    >
                      View calendar
                    </Button>
                  </div>
                </div>

                {/* Right Column - Network Previews */}
                <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                  <NetworkPreview
                    networks={selectedNetworks}
                    caption={caption}
                    firstComment={firstComment}
                    mediaItems={mediaItems}
                    validations={validations}
                    postStatus="DRAFT"
                  />
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Dev Helper - only in development */}
        <DevHelper />
      </div>
    </SidebarProvider>
  );
}
