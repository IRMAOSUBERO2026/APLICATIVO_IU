import { Camera } from "lucide-react";
import { useRef } from "react";

interface FuncionarioAvatarProps {
  nome: string;
  foto: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onPhotoChange?: (dataUrl: string) => void;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
};

export function FuncionarioAvatar({ nome, foto, size = "sm", editable = false, onPhotoChange }: FuncionarioAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = nome.split(" ").map(n => n[0]).join("").slice(0, 2);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onPhotoChange?.(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="relative group">
      {foto ? (
        <img
          src={foto}
          alt={nome}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-primary/20`}
        />
      ) : (
        <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}>
          {initials}
        </div>
      )}
      {editable && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-4 w-4 text-background" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}
