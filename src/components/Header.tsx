import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LogOut, Instagram, Images, Video, Construction } from 'lucide-react';

export const Header = () => {
  const { user, signOut } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <h1 className="text-sm sm:text-lg font-semibold truncate">Aprovação de Conteúdo</h1>
        </div>

        {user && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              variant="default" 
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScHxiU2xQOQz-7Z480crzkvTbIjYhHcdtb8Nuv98JSotdPcNg/viewform', '_blank')}
            >
              <Images className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Carrossel</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScy8tdv3CpBN0Kn_U6sBbfyk3fx3fbSBQcryOrmhVYw_sP1Xg/viewform?usp=dialog', '_blank')}
            >
              <Video className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Stories</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled
              className="cursor-not-allowed opacity-60 px-2 sm:px-3"
            >
              <Construction className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Post individual</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
};
