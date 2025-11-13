import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      duration={2000}
      toastOptions={{
        style: {
          background: '#18181b',
          border: '1px solid #3f3f46',
          color: '#fafafa',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
