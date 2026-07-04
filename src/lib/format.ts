export function formatINR(amount: number | null | undefined): string {
  if (!amount && amount !== 0) return "₹0";
  const num = Math.round(Number(amount));
  const sign = num < 0 ? "-" : "";
  const str = Math.abs(num).toString();
  if (str.length <= 3) return sign + "₹" + str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return sign + "₹" + formatted + "," + last3;
}

export function getPlan(totalInvested: number): { name: string; rate: number } {
  if (totalInvested >= 3100000) return { name: "FORTUNE", rate: 7 };
  if (totalInvested >= 1100000) return { name: "GROWTH", rate: 6 };
  return { name: "STARTER", rate: 5 };
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function genHadId(): string {
  return "HAD" + Math.floor(10000 + Math.random() * 90000).toString();
}