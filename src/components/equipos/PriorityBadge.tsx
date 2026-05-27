interface Props {
  rank: number | null;
  batteryLevel: number | null;
}

const PriorityBadge = ({ rank, batteryLevel }: Props) => {
  if (rank === null || batteryLevel === null) {
    return <span className="inline-block w-6" aria-hidden="true" />;
  }
  const color =
    batteryLevel < 30 ? 'bg-destructive text-destructive-foreground' :
    batteryLevel < 60 ? 'bg-warning text-warning-foreground' :
    'bg-success text-success-foreground';
  return (
    <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold ${color}`}>
      {rank}
    </span>
  );
};
export default PriorityBadge;
