/**
 * ScrollableTable
 *
 * Wrapper que renderiza tabelas largas com scrollbar horizontal FIXO
 * na parte inferior visível da tela (sticky bottom), eliminando a
 * necessidade de rolar até o fim do conteúdo para acessar o scroll.
 *
 * Uso:
 *   <ScrollableTable>
 *     <Table>...</Table>
 *   </ScrollableTable>
 */
import { useRef, useEffect, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollableTableProps {
  children: ReactNode;
  className?: string;
  /** Altura máxima do container — default "none" (cresce livremente) */
  maxHeight?: string;
}

export function ScrollableTable({ children, className, maxHeight }: ScrollableTableProps) {
  const outerRef = useRef<HTMLDivElement>(null);   // container externo (posição relativa)
  const innerRef = useRef<HTMLDivElement>(null);   // container com overflow-x-auto real
  const mirrorRef = useRef<HTMLDivElement>(null);  // barra espelho sticky
  const thumbRef = useRef<HTMLDivElement>(null);   // thumbtrack interno da barra espelho

  const [hasScroll, setHasScroll] = useState(false);

  /* ── sincroniza as larguras e o scroll entre inner <-> mirror ── */
  useEffect(() => {
    const inner = innerRef.current;
    const mirror = mirrorRef.current;
    const thumb = thumbRef.current;
    if (!inner || !mirror || !thumb) return;

    function sync() {
      if (!inner || !thumb) return;
      const ratio = inner.clientWidth / inner.scrollWidth;
      setHasScroll(inner.scrollWidth > inner.clientWidth + 2);
      thumb.style.width = `${ratio * 100}%`;
      thumb.style.transform = `translateX(${inner.scrollLeft / (inner.scrollWidth - inner.clientWidth) * (inner.clientWidth - ratio * inner.clientWidth)}px)`;
    }

    // Quando o inner scrollar → atualiza a thumb
    function onInnerScroll() { sync(); }

    // Quando o mirror for arrastado → propaga para o inner
    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    function onMirrorDown(e: MouseEvent | TouchEvent) {
      dragging = true;
      startX = "touches" in e ? e.touches[0].clientX : e.clientX;
      startScroll = inner!.scrollLeft;
      e.preventDefault();
    }
    function onMirrorMove(e: MouseEvent | TouchEvent) {
      if (!dragging || !inner) return;
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const delta = x - startX;
      const ratio = inner.scrollWidth / inner.clientWidth;
      inner.scrollLeft = startScroll + delta * ratio;
    }
    function onMirrorUp() { dragging = false; }

    // click na track (não na thumb) → pula para aquela posição
    function onTrackClick(e: MouseEvent) {
      if (!inner || !mirror) return;
      const rect = mirror.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = clickX / mirror.clientWidth;
      inner.scrollLeft = ratio * (inner.scrollWidth - inner.clientWidth);
    }

    const ro = new ResizeObserver(sync);
    ro.observe(inner);
    inner.addEventListener("scroll", onInnerScroll, { passive: true });
    mirror.addEventListener("click", onTrackClick);
    thumb.addEventListener("mousedown", onMirrorDown as EventListener);
    thumb.addEventListener("touchstart", onMirrorDown as EventListener, { passive: false });
    window.addEventListener("mousemove", onMirrorMove as EventListener);
    window.addEventListener("touchmove", onMirrorMove as EventListener, { passive: false });
    window.addEventListener("mouseup", onMirrorUp);
    window.addEventListener("touchend", onMirrorUp);

    sync(); // kick inicial

    return () => {
      ro.disconnect();
      inner.removeEventListener("scroll", onInnerScroll);
      mirror.removeEventListener("click", onTrackClick);
      thumb.removeEventListener("mousedown", onMirrorDown as EventListener);
      thumb.removeEventListener("touchstart", onMirrorDown as EventListener);
      window.removeEventListener("mousemove", onMirrorMove as EventListener);
      window.removeEventListener("touchmove", onMirrorMove as EventListener);
      window.removeEventListener("mouseup", onMirrorUp);
      window.removeEventListener("touchend", onMirrorUp);
    };
  }, []);

  return (
    <div ref={outerRef} className={cn("relative flex flex-col", className)}>
      {/* Conteúdo com scroll real (scrollbar nativo visível e estilizado) */}
      <div
        ref={innerRef}
        className="overflow-x-auto scrollbar-visible"
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        {children}
      </div>

      {/* Barra de rolagem horizontal STICKY adicional na base — sempre visível e moderna */}
      {hasScroll && (
        <div
          ref={mirrorRef}
          className="sticky bottom-0 z-20 h-4 w-full cursor-pointer rounded-b-md bg-muted border-t border-border/60 backdrop-blur-sm shadow-[0_-4px_12px_-6px_hsl(var(--foreground)/0.15)] flex items-center px-1"
          title="Arraste para rolar a tabela horizontalmente"
        >
          <div
            ref={thumbRef}
            className="relative h-2.5 min-w-[60px] rounded-full bg-primary/70 hover:bg-primary active:bg-primary transition-colors cursor-grab active:cursor-grabbing shadow-sm"
            style={{ willChange: "transform" }}
          />
        </div>
      )}
    </div>
  );
}
