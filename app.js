const colors = {
  aqua: "#38d6c8",
  gold: "#f4bf4f",
  rose: "#ff6f8e",
  green: "#89d86d",
  blue: "#71a7ff",
  ink: "#f6f2e8",
  muted: "#b8b1a4",
  surfaceStrong: "#20242b",
};

const tooltip = d3.select("#tooltip");

function showTooltip(event, title, detail) {
  tooltip
    .html(`<strong>${title}</strong><span>${detail}</span>`)
    .classed("visible", true)
    .style("transform", `translate(${event.clientX + 16}px, ${event.clientY + 16}px)`);
}

function hideTooltip() {
  tooltip.classed("visible", false).style("transform", "translate(-999px, -999px)");
}

function fitSvg(selector, renderer) {
  const svg = d3.select(selector);
  const container = svg.node().parentElement;
  const resize = () => {
    const rect = container.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(400, rect.height);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    renderer(svg, width, height);
  };

  new ResizeObserver(resize).observe(container);
  resize();
}

function renderForce() {
  const groups = [
    { key: "Data", color: colors.aqua },
    { key: "Design", color: colors.gold },
    { key: "Motion", color: colors.rose },
    { key: "Systems", color: colors.green },
  ];

  const nodes = d3.range(34).map((i) => {
    const group = groups[i % groups.length];
    return {
      id: `Node ${i + 1}`,
      group: group.key,
      color: group.color,
      radius: 7 + ((i * 13) % 16),
      influence: 40 + ((i * 17) % 90),
    };
  });

  const links = d3.range(56).map((i) => ({
    source: nodes[i % nodes.length].id,
    target: nodes[(i * 7 + 9) % nodes.length].id,
    strength: 0.22 + ((i % 6) * 0.035),
  }));

  let simulation;
  fitSvg("#force-viz", (svg, width, height) => {
    svg.selectAll("*").remove();
    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", 4).attr("result", "coloredBlur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const backdrop = svg
      .append("g")
      .selectAll("circle")
      .data(d3.range(44))
      .join("circle")
      .attr("cx", (_, i) => ((i * 97) % width))
      .attr("cy", (_, i) => ((i * 53) % height))
      .attr("r", (_, i) => 0.8 + (i % 4) * 0.55)
      .attr("fill", "rgba(246,242,232,0.42)");

    backdrop
      .append("animate")
      .attr("attributeName", "opacity")
      .attr("values", "0.18;0.75;0.18")
      .attr("dur", (_, i) => `${3 + (i % 5)}s`)
      .attr("repeatCount", "indefinite");

    const link = svg
      .append("g")
      .attr("stroke", "rgba(246,242,232,0.23)")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", "rgba(255,255,255,0.72)")
      .attr("stroke-width", 1.4)
      .attr("filter", "url(#glow)")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.25).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      )
      .on("pointermove", (event, d) => {
        showTooltip(event, d.id, `${d.group} cluster - influence ${d.influence}`);
      })
      .on("pointerleave", hideTooltip);

    const labels = svg
      .append("g")
      .selectAll("text")
      .data(groups)
      .join("text")
      .attr("fill", (d) => d.color)
      .attr("font-size", 13)
      .attr("font-weight", 800)
      .text((d) => d.key);

    simulation?.stop();
    simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).strength((d) => d.strength).distance(96))
      .force("charge", d3.forceManyBody().strength(-210))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => d.radius + 5))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

        labels
          .attr("x", (_, i) => 24)
          .attr("y", (_, i) => 34 + i * 24);
      });
  });
}

function renderRadial() {
  const data = {
    name: "D3",
    children: [
      {
        name: "Shapes",
        children: [
          { name: "Arc", value: 35 },
          { name: "Area", value: 28 },
          { name: "Line", value: 32 },
          { name: "Stack", value: 24 },
        ],
      },
      {
        name: "Motion",
        children: [
          { name: "Force", value: 38 },
          { name: "Transition", value: 31 },
          { name: "Timer", value: 18 },
        ],
      },
      {
        name: "Maps",
        children: [
          { name: "Projection", value: 29 },
          { name: "Contours", value: 21 },
          { name: "Voronoi", value: 25 },
        ],
      },
      {
        name: "Scales",
        children: [
          { name: "Sequential", value: 27 },
          { name: "Band", value: 20 },
          { name: "Log", value: 16 },
        ],
      },
    ],
  };

  fitSvg("#radial-viz", (svg, width, height) => {
    svg.selectAll("*").remove();
    const size = Math.min(width, height) - 44;
    const root = d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value);

    d3.pack().size([size, size]).padding(9)(root);
    const g = svg.append("g").attr("transform", `translate(${(width - size) / 2}, ${(height - size) / 2})`);
    const palette = d3.scaleOrdinal([colors.aqua, colors.gold, colors.rose, colors.green, colors.blue]);

    const node = g
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    node
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => (d.depth === 0 ? "rgba(246,242,232,0.04)" : palette(d.ancestors().at(-2)?.data.name || d.data.name)))
      .attr("fill-opacity", (d) => (d.children ? 0.22 : 0.82))
      .attr("stroke", "rgba(255,255,255,0.45)")
      .attr("stroke-width", (d) => (d.depth === 0 ? 1 : 1.4))
      .on("pointermove", (event, d) => {
        const path = d.ancestors().reverse().map((item) => item.data.name).join(" / ");
        showTooltip(event, d.data.name, `${path} - weight ${Math.round(d.value)}`);
      })
      .on("pointerleave", hideTooltip)
      .transition()
      .duration(900)
      .delay((d) => d.depth * 90)
      .attr("r", (d) => d.r);

    node
      .filter((d) => !d.children && d.r > 21)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#101114")
      .attr("font-size", (d) => Math.min(14, d.r / 3.2))
      .attr("font-weight", 800)
      .text((d) => d.data.name);

    node
      .filter((d) => d.depth === 1)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -d.r + 18)
      .attr("fill", colors.ink)
      .attr("font-size", 15)
      .attr("font-weight", 800)
      .text((d) => d.data.name);
  });
}

function renderStream() {
  const keys = ["Signals", "Queries", "Views", "Flows", "Models"];
  const dataset = d3.range(48).map((i) => {
    const row = { month: i };
    keys.forEach((key, j) => {
      row[key] = 18 + Math.sin(i / (2.3 + j) + j) * 10 + Math.cos(i / 5 + j * 1.7) * 7 + ((i * (j + 4)) % 13);
    });
    return row;
  });

  fitSvg("#stream-viz", (svg, width, height) => {
    svg.selectAll("*").remove();
    const margin = { top: 42, right: 30, bottom: 42, left: 44 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const series = stack(dataset);
    const x = d3.scaleLinear().domain(d3.extent(dataset, (d) => d.month)).range([0, innerWidth]);
    const y = d3
      .scaleLinear()
      .domain([
        d3.min(series, (layer) => d3.min(layer, (d) => d[0])),
        d3.max(series, (layer) => d3.max(layer, (d) => d[1])),
      ])
      .range([innerHeight, 0]);
    const color = d3.scaleOrdinal().domain(keys).range([colors.aqua, colors.gold, colors.rose, colors.green, colors.blue]);
    const area = d3
      .area()
      .curve(d3.curveCatmullRom.alpha(0.55))
      .x((d) => x(d.data.month))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]));

    const layers = g
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", (d) => color(d.key))
      .attr("fill-opacity", 0.82)
      .attr("stroke", "rgba(16,17,20,0.46)")
      .attr("stroke-width", 1.2)
      .attr("d", area)
      .on("pointermove", (event, d) => {
        const [mx] = d3.pointer(event, g.node());
        const month = Math.round(x.invert(mx));
        const datum = dataset[Math.max(0, Math.min(dataset.length - 1, month))];
        showTooltip(event, d.key, `Month ${datum.month + 1} - value ${Math.round(datum[d.key])}`);
      })
      .on("pointerleave", hideTooltip);

    layers
      .attr("transform", `translate(${innerWidth},0)`)
      .transition()
      .duration(1150)
      .ease(d3.easeCubicOut)
      .attr("transform", "translate(0,0)");

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `M${d + 1}`))
      .call((axis) => axis.select(".domain").remove());

    g.selectAll(".legend")
      .data(keys)
      .join("g")
      .attr("class", "legend")
      .attr("transform", (_, i) => `translate(${i * 92}, -20)`)
      .call((legend) => legend.append("circle").attr("r", 5).attr("fill", (d) => color(d)))
      .call((legend) =>
        legend
          .append("text")
          .attr("x", 12)
          .attr("y", 4)
          .attr("fill", colors.ink)
          .attr("font-size", 12)
          .text((d) => d),
      );
  });
}

renderForce();
renderRadial();
renderStream();
