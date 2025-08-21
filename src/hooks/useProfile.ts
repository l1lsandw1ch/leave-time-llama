import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          await createProfile();
          return;
        }
        toast({
          title: "Error",
          description: "Failed to load profile.",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || 'User',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const updateProfile = async (updates: { display_name?: string; avatar_url?: string }) => {
    if (!user) return null;

    try {
      // If no profile exists, create one first
      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            display_name: updates.display_name || user.email?.split('@')[0] || 'User',
            avatar_url: updates.avatar_url || null,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          toast({
            title: "Error",
            description: "Failed to create profile.",
            variant: "destructive",
          });
          return null;
        }

        setProfile(newProfile);
        toast({
          title: "Success",
          description: "Profile created successfully.",
        });
        return newProfile;
      }

      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile.",
          variant: "destructive",
        });
        return null;
      }

      setProfile(data);
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error", 
        description: "Failed to update profile.",
        variant: "destructive",
      });
      return null;
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        toast({
          title: "Error",
          description: "Failed to upload avatar.",
          variant: "destructive",
        });
        return null;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: data.publicUrl });
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // Update password directly - Supabase will handle current password verification
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Error changing password:', error);
        toast({
          title: "Error",
          description: "Failed to change password.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Password changed successfully.",
      });
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    uploadAvatar,
    changePassword,
    refreshProfile: loadProfile,
  };
};