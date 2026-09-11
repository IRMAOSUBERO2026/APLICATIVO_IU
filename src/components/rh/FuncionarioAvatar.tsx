import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FuncionarioAvatarProps {
  nome: string;
  foto: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onPhotoChange?: (url: string) => void;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
};

const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;

export function FuncionarioAvatar({ nome, foto, size = "sm", editable = false, onPhotoChange }: FuncionarioAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const initials = nome.split(" ").map(n => n[0]).join("").slice(0, 2);

  // A foto é enviada para o Storage e apenas o link fica no cadastro.
  // Guardar a imagem em base64 no banco deixava as consultas do RH lentas.
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `funcionarios/fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("documentos").upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage.from("documentos").createSignedUrl(path, DEZ_ANOS);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("Não foi possível gerar o link da foto.");
      onPhotoChange?.(data.signedUrl);
      toast({ title: "Foto enviada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative group">
      {foto ? (
        <img
          src={foto}
          alt={nome}
          loading="lazy"
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
            type="button"
            disabled={enviando}
            onClick={() => fileRef.current?.click()}
            className={`absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 transition-opacity cursor-pointer ${enviando ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin text-background" /> : <Camera className="h-4 w-4 text-background" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}
