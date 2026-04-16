import React from 'react';
import { UISlotId } from '@/kernel/core/Constants';
import { useSlot } from '@/kernel/hooks/useSlot';

interface SlotProps {
  name: UISlotId;
  className?: string;
  itemWrapper?: React.ComponentType<{ children: React.ReactNode, item: any }>;
}

export function Slot({ name, className, itemWrapper: Wrapper }: SlotProps) {
  const items = useSlot(name);

  if (items.length === 0) return null;

  return (
    <div className={className}>
      {items.map((item) => {
        const Comp = item.component;
        const content = <Comp key={item.id} {...item.props} />;

        if (Wrapper) {
          return <Wrapper key={item.id} item={item}>{content}</Wrapper>;
        }
        return content;
      })}
    </div>
  );
}
