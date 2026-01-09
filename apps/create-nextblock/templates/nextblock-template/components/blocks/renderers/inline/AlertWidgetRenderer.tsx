'use client';

interface AlertWidgetRendererProps {
  type: 'info' | 'warning' | 'notification' | 'danger';
  title: string;
  message: string;
  align: 'left' | 'center' | 'right';
  size: 'fit-content' | 'full-width';
  textAlign: 'left' | 'center' | 'right';
}

const AlertWidgetRenderer = ({ type, title, message, align, size, textAlign }: AlertWidgetRendererProps) => {
  const alertClasses: { [key: string]: string } = {
    info:         'bg-accent/60 text-accent-foreground border-2 border-accent',
    warning:      'bg-warning/60 text-warning-foreground border-2 border-warning',
    notification: 'bg-muted/60 text-muted-foreground border-2 border-muted-foreground',
    danger:       'bg-destructive/60 text-destructive-foreground border-2 border-destructive',
  };

  const sizeClasses: { [key: string]: string } = {
    'fit-content': 'w-auto',
    'full-width': 'w-full',
  };

  const alignClasses: { [key: string]: string } = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const textAlignClasses: { [key: string]: string } = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`${alignClasses[align] || 'text-left'}`}>
      <div
        className={`inline-block rounded-lg border p-2 m-1 ${alertClasses[type] || alertClasses.info} ${
          sizeClasses[size] || sizeClasses['fit-content']
        } ${textAlignClasses[textAlign] || textAlignClasses.left}`}
      >
        <strong className="font-bold block">{title}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default AlertWidgetRenderer;