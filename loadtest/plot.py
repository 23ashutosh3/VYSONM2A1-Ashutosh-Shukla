"""Plots loadtest/results.csv as a latency graph -> screenshots/latency.png"""
import csv
import matplotlib.pyplot as plt

rows = list(csv.DictReader(open("loadtest/results.csv")))
endpoints = ["/shorten", "/redirect"]

fig, axes = plt.subplots(1, 2, figsize=(13, 5), sharey=True)
for ax, ep in zip(axes, endpoints):
    data = [r for r in rows if r["endpoint"] == ep and r["p50_ms"]]
    x = [int(r["concurrency"]) for r in data]
    for p in ["p50", "p90", "p95", "p99"]:
        ax.plot(x, [float(r[f"{p}_ms"]) for r in data], marker="o", label=p)
    # mark levels where requests started failing
    for r in data:
        if int(r["success_rate"]) < 100:
            ax.axvline(int(r["concurrency"]), color="red", alpha=0.25)
    ax.set_xscale("log")
    ax.set_xticks(x, [str(v) for v in x])
    ax.set_title(f"{'POST' if ep == '/shorten' else 'GET'} {ep}")
    ax.set_xlabel("Concurrent requests")
    ax.grid(alpha=0.3)
    ax.legend()

axes[0].set_ylabel("Latency (ms)")
fig.suptitle("Latency vs concurrency (red = some requests failed/timed out)")
fig.tight_layout()
fig.savefig("screenshots/latency.png", dpi=150)
print("Saved screenshots/latency.png")
