import { SocialNetwork } from '@/types/social';
import { NETWORK_CONSTRAINTS, NETWORK_INFO } from '@/lib/socialNetworks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface FirstCommentInputProps {
  firstComment: string;
  onFirstCommentChange: (comment: string) => void;
  selectedNetworks: SocialNetwork[];
}

export function FirstCommentInput({ 
  firstComment, 
  onFirstCommentChange, 
  selectedNetworks 
}: FirstCommentInputProps) {
  // Check if any selected network supports first comment
  const supportingNetworks = selectedNetworks.filter(
    network => NETWORK_CONSTRAINTS[network].supports_first_comment
  );

  if (supportingNetworks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>First comment (optional)</CardTitle>
        <CardDescription>
          Automatically post this as the first comment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Only supported on {supportingNetworks.map(n => NETWORK_INFO[n].name).join(', ')}
          </span>
        </div>

        <Textarea
          value={firstComment}
          onChange={(e) => onFirstCommentChange(e.target.value)}
          placeholder="First comment (optional)..."
          className="min-h-[80px] resize-none"
        />

        {/* Character counter */}
        {firstComment && supportingNetworks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {supportingNetworks.map(network => {
              const constraints = NETWORK_CONSTRAINTS[network];
              const max = constraints.max_first_comment_length || 0;
              const count = firstComment.length;
              const isOver = count > max;

              return (
                <Badge
                  key={network}
                  variant={isOver ? 'destructive' : 'secondary'}
                  className="text-xs font-semibold"
                >
                {(() => {
                  const NetworkIcon = NETWORK_INFO[network].icon;
                  return <NetworkIcon className="h-3 w-3 mr-1" />;
                })()}
                  {count}/{max}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
