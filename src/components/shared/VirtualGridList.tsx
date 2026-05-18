import { List, type RowComponentProps } from "react-window";
import { ReactNode, CSSProperties, useMemo } from "react";

type Props<T> = {
  items: T[];
  rowHeight: number;
  height?: number;
  gridTemplate: string;
  minWidth?: number;
  renderRow: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
};

type RowExtra<T> = { items: T[]; gridTemplate: string; minWidth: number; renderRow: (item: T, index: number) => ReactNode };

function VirtualRow<T>({ index, style, items, gridTemplate, minWidth, renderRow }: RowComponentProps<RowExtra<T>>) {
  const item = items[index];
  if (!item) return null;
  const rowStyle: CSSProperties = {
    ...style,
    display: "grid",
    gridTemplateColumns: gridTemplate,
    minWidth,
    alignItems: "center",
    borderBottom: "1px solid hsl(var(--border))",
  };
  return (
    <div style={rowStyle} className="hover:bg-muted/30 transition-colors">
      {renderRow(item, index)}
    </div>
  );
}

export function VirtualGridList<T>({ items, rowHeight, height = 600, gridTemplate, minWidth = 0, renderRow, emptyMessage = "Nenhum item" }: Props<T>) {
  const rowProps = useMemo(() => ({ items, gridTemplate, minWidth, renderRow }), [items, gridTemplate, minWidth, renderRow]);

  if (items.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  // Cap actual list height so it doesn't render an empty viewport for small datasets
  const computedHeight = Math.min(height, items.length * rowHeight + 4);

  return (
    <div className="overflow-x-auto scrollbar-visible">
      <div style={{ minWidth }}>
        <List
          rowComponent={VirtualRow as any}
          rowCount={items.length}
          rowHeight={rowHeight}
          rowProps={rowProps as any}
          style={{ height: computedHeight, width: "100%" }}
        />
      </div>
    </div>
  );
}
