import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { GroomingPolicyTermsContent } from '../legal/GroomingPolicyTermsContent';

interface BookingTermsAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
}

/** Final-step TNC: copy comes from `services` grooming policy keys (same as /grooming-policy page). */
export function BookingTermsAgreementDialog({
  open,
  onOpenChange,
  onAgree,
}: BookingTermsAgreementDialogProps) {
  const { t } = useTranslation('booking');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] flex max-h-[min(92vh,900px)] min-h-0 w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-amber-100 bg-[#FFFDF7] px-6 pb-3 pt-6 pr-14">
          <DialogTitle>{t('modal.termsDialogTitle')}</DialogTitle>
          <p className="text-left text-xs text-amber-900/75 sm:text-sm">{t('modal.termsDialogSubtitle')}</p>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FFFDF7] px-6 py-4">
          <GroomingPolicyTermsContent compact />
        </div>
        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-amber-200 bg-gradient-to-b from-amber-50/90 to-yellow-50 px-6 py-4 sm:flex-row sm:justify-center sm:gap-3">
          <Button type="button" variant="outline" className="border-amber-300 bg-white" onClick={() => onOpenChange(false)}>
            {t('modal.termsBack')}
          </Button>
          <Button
            type="button"
            className="w-full min-h-11 shrink-0 bg-gradient-to-r from-[#F9C74F] to-[#FFCC00] text-amber-950 shadow-sm hover:from-amber-400 hover:to-amber-300 sm:w-auto"
            onClick={() => {
              onAgree();
              onOpenChange(false);
            }}
          >
            {t('modal.termsAgree')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
