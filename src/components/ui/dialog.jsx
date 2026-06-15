import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
});

/** Sheet-style: slides up from the bottom, max phone width, like the mockups. */
const DialogContent = React.forwardRef(function DialogContent({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        className={cn(
          'bg-card fixed inset-x-0 bottom-0 z-50 mx-auto grid w-full max-w-[480px] gap-4 rounded-t-2xl border-t p-5 shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'pb-[calc(20px+env(safe-area-inset-bottom))]',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 disabled:pointer-events-none">
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogHeader({ className, ...props }) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-1 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }) {
  return <div data-slot="dialog-footer" className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('text-lg font-semibold leading-none', className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger,
};
