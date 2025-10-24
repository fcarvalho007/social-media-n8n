import { SocialNetwork, SocialProfile } from '@/types/social';

export const MOCK_PROFILES: SocialProfile[] = [
  {
    id: 'mock-1',
    user_id: 'mock-user',
    network: 'instagram',
    profile_name: 'My Instagram',
    profile_handle: 'myhandle',
    profile_image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
    connection_status: 'connected',
    profile_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    user_id: 'mock-user',
    network: 'linkedin',
    profile_name: 'Professional Profile',
    profile_handle: 'mycompany',
    profile_image_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=100&h=100&fit=crop',
    connection_status: 'connected',
    profile_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    user_id: 'mock-user',
    network: 'x',
    profile_name: 'X Account',
    profile_handle: 'mytwitter',
    connection_status: 'expired',
    profile_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    user_id: 'mock-user',
    network: 'facebook',
    profile_name: 'Facebook Page',
    profile_handle: 'myfbpage',
    profile_image_url: 'https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=100&h=100&fit=crop',
    connection_status: 'connected',
    profile_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_MEDIA = [
  {
    id: 'media-1',
    file_name: 'sunset.jpg',
    file_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop',
    width: 800,
    height: 800,
    aspect_ratio: '1:1',
    is_favorite: true,
  },
  {
    id: 'media-2',
    file_name: 'mountains.jpg',
    file_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
    width: 800,
    height: 600,
    aspect_ratio: '4:3',
    is_favorite: false,
  },
  {
    id: 'media-3',
    file_name: 'city.jpg',
    file_type: 'image',
    file_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&h=800&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=150&h=200&fit=crop',
    width: 600,
    height: 800,
    aspect_ratio: '3:4',
    is_favorite: true,
  },
];

// Function to add mock profiles to database for testing
export async function addMockProfiles(supabase: any, userId: string) {
  const profiles = MOCK_PROFILES.map(p => ({
    ...p,
    user_id: userId,
  }));

  const { error } = await supabase
    .from('social_profiles')
    .upsert(profiles, { onConflict: 'id' });

  if (error) {
    console.error('Error adding mock profiles:', error);
  }
  return profiles;
}

// Function to add mock media to database for testing
export async function addMockMedia(supabase: any, userId: string) {
  const media = MOCK_MEDIA.map(m => ({
    ...m,
    user_id: userId,
  }));

  const { error } = await supabase
    .from('media_library')
    .upsert(media, { onConflict: 'id' });

  if (error) {
    console.error('Error adding mock media:', error);
  }
  return media;
}
