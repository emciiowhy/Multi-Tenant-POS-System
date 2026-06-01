import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Feature {
  title: string;
  body: string;
  /** Optional pill (e.g. an upcoming module). */
  tag?: string;
}

// Core capabilities (POS, Shifts, Returns) + the differentiators (offline,
// real-time, multi-branch) + the upcoming Restaurant vertical.
const FEATURES: Feature[] = [
  {
    title: "Point of Sale",
    body: "A fast, offline-first register that keeps selling through outages and reconciles automatically on reconnect.",
  },
  {
    title: "Real-time sync",
    body: "Sales, stock, and prices propagate live to every device and branch the moment connectivity returns.",
  },
  {
    title: "Multi-branch & multi-tenant",
    body: "Run one store or a whole group — each tenant isolated, each branch reporting into the same books.",
  },
  {
    title: "Shift Management",
    body: "Open and close tills with cash counts and per-shift takings, so every drawer is accounted for.",
  },
  {
    title: "Returns & refunds",
    body: "Process refunds against the original sale with full audit trail and stock restoration.",
  },
  {
    title: "Restaurant",
    body: "Floor plans, table service, and a kitchen display system for food & beverage venues.",
    tag: "Coming soon",
  },
];

/** Interactive feature grid (slice 08). Reuses the `Card` surface; tasteful
 *  motion-safe hover lift, no animation library. */
export function FeatureGrid() {
  return (
    <section
      data-testid="feature-grid"
      aria-labelledby="features-heading"
      className="bg-surface-2"
    >
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2
          id="features-heading"
          className="text-center text-3xl font-bold tracking-tight text-fg"
        >
          Everything you need to run the floor
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-fg-muted">
          From a single register to a multi-branch restaurant group — one platform, online or off.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="flex flex-col gap-3 transition-[transform,border-color] duration-200 hover:border-brand motion-safe:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-fg">{f.title}</h3>
                {f.tag && <Badge variant="warning">{f.tag}</Badge>}
              </div>
              <p className="text-sm text-fg-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
