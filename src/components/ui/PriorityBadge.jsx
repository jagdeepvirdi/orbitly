import { PRIORITY } from '../../store/appStore';

export default function PriorityBadge({ priority, small = false }) {
  const p = PRIORITY[priority] || PRIORITY.Normal;
  return (
    <span style={{
      fontSize: small ? 10 : 10.5,
      fontWeight: 700,
      padding: small ? '3px 7px' : '3px 8px',
      borderRadius: small ? 6 : 7,
      background: p.bg,
      color: p.color,
    }}>
      {priority}
    </span>
  );
}
