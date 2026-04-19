import { STAGES } from "@/lib/constants"

export function StageChip({
  stageId,
  size = "default",
}: {
  stageId: string
  size?: "default" | "sm"
}) {
  const stage = STAGES.find((s) => s.id === stageId)
  if (!stage) return null

  const isSmall = size === "sm"

  return (
    <span
      className="inline-flex items-center gap-[5px] rounded-[999px] font-semibold whitespace-nowrap"
      style={{
        padding: isSmall ? "2px 8px" : "3px 10px",
        fontSize: isSmall ? "10px" : "11px",
        fontWeight: 600,
        color: stage.color,
        backgroundColor: stage.color + "15",
      }}
    >
      <span
        className="inline-block h-[6px] w-[6px] rounded-full"
        style={{ backgroundColor: stage.color }}
      />
      {stage.label}
    </span>
  )
}
