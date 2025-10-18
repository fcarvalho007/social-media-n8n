import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { CarouselPreview } from '@/components/CarouselPreview';
import { CaptionEditor } from '@/components/CaptionEditor';
import { ActionBar } from '@/components/ActionBar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Review = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<'A' | 'B' | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setPost(data);
      setCaption(data.caption_edited || data.caption);
      setHashtags(data.hashtags_edited || data.hashtags || []);
      setSelectedTemplate(data.selected_template as 'A' | 'B' | null);
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
      navigate('/pending');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          caption_edited: caption,
          hashtags_edited: hashtags,
          notes,
          selected_template: selectedTemplate,
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
      throw error;
    }
  };

  const handleApprove = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'approved',
          selected_template: selectedTemplate,
          caption_edited: caption,
          hashtags_edited: hashtags,
          notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Post approved successfully!');
      navigate('/pending');
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve post');
      throw error;
    }
  };

  const handleReject = async (rejectNotes?: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: 'rejected',
          notes: rejectNotes || notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Post rejected');
      navigate('/pending');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject post');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <main className="container py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/pending')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{post.tema}</h2>
          <p className="text-muted-foreground">Select your preferred template and review the content</p>
        </div>

        {/* Templates - Side by side on desktop, stacked on mobile */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <CarouselPreview
            images={post.template_a_images}
            template="A"
            onSelect={() => setSelectedTemplate('A')}
            isSelected={selectedTemplate === 'A'}
          />
          <CarouselPreview
            images={post.template_b_images}
            template="B"
            onSelect={() => setSelectedTemplate('B')}
            isSelected={selectedTemplate === 'B'}
          />
        </div>

        {/* Caption and Hashtags Editor */}
        <div className="mb-8">
          <CaptionEditor
            initialCaption={post.caption}
            initialHashtags={post.hashtags || []}
            onChange={(newCaption, newHashtags) => {
              setCaption(newCaption);
              setHashtags(newHashtags);
            }}
          />
        </div>

        {/* Internal Notes */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
            Internal Notes
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any internal notes about this post..."
            className="min-h-[100px]"
          />
        </div>
      </main>

      <ActionBar
        canApprove={!!selectedTemplate}
        onApprove={handleApprove}
        onReject={handleReject}
        onSave={handleSave}
      />
    </div>
  );
};

export default Review;
