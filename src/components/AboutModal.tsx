import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Mail, Calendar, User } from 'lucide-react';

export const AboutModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gradient-primary">
            À Propos - ERT App
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Développeur</p>
              <p className="font-semibold">Tarek Attia</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a 
                href="mailto:benattiatarek2@gmail.com" 
                className="font-semibold text-primary hover:underline"
              >
                benattiatarek2@gmail.com
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Date de sortie</p>
              <p className="font-semibold">Janvier 2026</p>
            </div>
          </div>
          
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Application de Tomographie de Résistivité Électrique
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Compatible avec Res2DInv
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
