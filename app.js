const palette = {
  ink: "#f7f3ea",
  muted: "#aaa398",
  paper: "#fff8ec",
  bg: "#0d0e10",
  panel: "#17191d",
  cyan: "#42dfd1",
  amber: "#f6c15a",
  coral: "#ff7a84",
  lime: "#93dd6f",
  sky: "#7aafff",
  violet: "#b69cff",
};

const swatches = [palette.cyan, palette.amber, palette.coral, palette.lime, palette.sky, palette.violet];
const tooltip = d3.select("#tooltip");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  let cleanup = () => {};

  const resize = () => {
    cleanup();
    const rect = container.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(360, rect.height);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    cleanup = renderer(svg, width, height) || (() => {});
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
}

function makeDefs(svg, id, width, height) {
  const defs = svg.append("defs");

  const glow = defs.append("filter").attr("id", `${id}-glow`).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  glow.append("feGaussianBlur").attr("stdDeviation", 5).attr("result", "blur");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const wash = defs.append("radialGradient").attr("id", `${id}-wash`).attr("cx", "46%").attr("cy", "38%");
  wash.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,255,255,0.16)");
  wash.append("stop").attr("offset", "52%").attr("stop-color", "rgba(66,223,209,0.08)");
  wash.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,0,0)");

  const vignette = defs.append("radialGradient").attr("id", `${id}-vignette`);
  vignette.append("stop").attr("offset", "58%").attr("stop-color", "rgba(0,0,0,0)");
  vignette.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,0,0.42)");

  defs
    .append("clipPath")
    .attr("id", `${id}-clip`)
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", 8);

  return { glow: `url(#${id}-glow)`, wash: `url(#${id}-wash)`, vignette: `url(#${id}-vignette)`, clip: `url(#${id}-clip)` };
}

function drawAtmosphere(svg, id, width, height, density = 68) {
  const defs = makeDefs(svg, id, width, height);

  svg.append("rect").attr("width", width).attr("height", height).attr("fill", defs.wash);

  svg
    .append("g")
    .attr("clip-path", defs.clip)
    .selectAll("circle")
    .data(d3.range(density))
    .join("circle")
    .attr("cx", (d) => (d * 137.5) % width)
    .attr("cy", (d) => (d * 73 + Math.sin(d) * 80 + height) % height)
    .attr("r", (d) => 0.55 + (d % 5) * 0.28)
    .attr("fill", "rgba(247,243,234,0.56)")
    .attr("opacity", (d) => 0.12 + (d % 7) * 0.035);

  svg.append("rect").attr("width", width).attr("height", height).attr("fill", defs.vignette);
  return defs;
}

function renderHero() {
  fitSvg("#hero-viz", (svg, width, height) => {
    const defs = drawAtmosphere(svg, "hero", width, height, 90);
    const center = [width * 0.52, height * 0.48];
    const maxRadius = Math.min(width, height) * 0.4;
    const color = d3.scaleOrdinal(swatches);

    const rings = d3.range(7).map((i) => ({
      r: maxRadius * (0.2 + i * 0.12),
      dash: `${4 + i * 2} ${10 + i * 3}`,
      spin: i % 2 ? -1 : 1,
    }));

    const ringGroup = svg.append("g").attr("transform", `translate(${center[0]},${center[1]})`);

    ringGroup
      .selectAll("circle")
      .data(rings)
      .join("circle")
      .attr("r", (d) => d.r)
      .attr("fill", "none")
      .attr("stroke", "rgba(247,243,234,0.12)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", (d) => d.dash);

    const arc = d3.arc();
    const arcs = d3.range(24).map((i) => {
      const lane = i % rings.length;
      const span = 0.22 + (i % 5) * 0.08;
      const start = (i / 24) * Math.PI * 2;
      return {
        innerRadius: rings[lane].r - 1.8,
        outerRadius: rings[lane].r + 1.8,
        startAngle: start,
        endAngle: start + span,
        color: color(i),
      };
    });

    const arcGroup = ringGroup.append("g").attr("filter", defs.glow);
    arcGroup
      .selectAll("path")
      .data(arcs)
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.9);

    const nodes = d3.range(42).map((i) => {
      const angle = (i / 42) * Math.PI * 2 + Math.sin(i) * 0.35;
      const lane = rings[i % rings.length].r;
      return {
        x: center[0] + Math.cos(angle) * lane,
        y: center[1] + Math.sin(angle) * lane * 0.78,
        r: 2.8 + (i % 6) * 0.8,
        color: color(i),
        phase: angle,
      };
    });

    svg
      .append("g")
      .attr("filter", defs.glow)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.r)
      .attr("fill", (d) => d.color)
      .attr("stroke", "rgba(255,255,255,0.72)")
      .attr("stroke-width", 0.9);

    const ribbon = d3
      .line()
      .curve(d3.curveCatmullRomClosed.alpha(0.65))
      .x((d) => d.x)
      .y((d) => d.y);

    svg
      .append("path")
      .datum(nodes.filter((_, i) => i % 3 === 0))
      .attr("d", ribbon)
      .attr("fill", "none")
      .attr("stroke", "rgba(247,243,234,0.26)")
      .attr("stroke-width", 1.2);

    if (!reducedMotion) {
      const timer = d3.timer((elapsed) => {
        const t = elapsed / 18000;
        ringGroup.attr("transform", `translate(${center[0]},${center[1]}) rotate(${t * 360})`);
        arcGroup.attr("transform", `rotate(${-t * 520})`);
      });
      return () => timer.stop();
    }
  });
}

function renderForce() {
  const groups = [
    { key: "Structure", color: palette.cyan, anchor: [0.28, 0.32] },
    { key: "Motion", color: palette.coral, anchor: [0.72, 0.34] },
    { key: "Meaning", color: palette.amber, anchor: [0.36, 0.7] },
    { key: "Systems", color: palette.lime, anchor: [0.72, 0.72] },
  ];

  const nodes = d3.range(38).map((i) => {
    const group = groups[i % groups.length];
    return {
      id: `${group.key} ${String(i + 1).padStart(2, "0")}`,
      group: group.key,
      color: group.color,
      mass: 24 + ((i * 19) % 86),
      radius: 5.5 + ((i * 11) % 17),
    };
  });

  const links = d3.range(68).map((i) => ({
    source: nodes[i % nodes.length].id,
    target: nodes[(i * 9 + 13) % nodes.length].id,
    strength: 0.09 + (i % 7) * 0.018,
  }));

  let simulation;

  fitSvg("#force-viz", (svg, width, height) => {
    simulation?.stop();
    const defs = drawAtmosphere(svg, "force", width, height, 80);

    const linkGradient = svg.select("defs").append("linearGradient").attr("id", "force-link-gradient").attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("x2", width);
    linkGradient.append("stop").attr("offset", "0%").attr("stop-color", palette.cyan).attr("stop-opacity", 0.12);
    linkGradient.append("stop").attr("offset", "50%").attr("stop-color", palette.paper).attr("stop-opacity", 0.34);
    linkGradient.append("stop").attr("offset", "100%").attr("stop-color", palette.coral).attr("stop-opacity", 0.12);

    const anchors = svg
      .append("g")
      .selectAll("g")
      .data(groups)
      .join("g")
      .attr("transform", (d) => `translate(${d.anchor[0] * width},${d.anchor[1] * height})`);

    anchors
      .append("circle")
      .attr("r", Math.min(width, height) * 0.105)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-opacity", 0.18)
      .attr("stroke-dasharray", "2 7");

    anchors
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", 4)
      .attr("fill", (d) => d.color)
      .attr("font-size", 12)
      .attr("font-weight", 820)
      .text((d) => d.key);

    const link = svg
      .append("g")
      .attr("stroke", "url(#force-link-gradient)")
      .attr("stroke-width", 1.05)
      .selectAll("line")
      .data(links)
      .join("line");

    const node = svg
      .append("g")
      .attr("filter", defs.glow)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", 0.92)
      .attr("stroke", "rgba(255,255,255,0.78)")
      .attr("stroke-width", 1.15)
      .style("cursor", "grab")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.28).restart();
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
      .on("pointerenter", function (_event, d) {
        d3.select(this).transition().duration(160).attr("r", d.radius + 4);
      })
      .on("pointermove", (event, d) => showTooltip(event, d.id, `${d.group} cluster - mass ${d.mass}`))
      .on("pointerleave", function (_event, d) {
        d3.select(this).transition().duration(180).attr("r", d.radius);
        hideTooltip();
      });

    simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).strength((d) => d.strength).distance((d) => 74 + d.strength * 260))
      .force("charge", d3.forceManyBody().strength((d) => -120 - d.mass * 1.35))
      .force("collide", d3.forceCollide().radius((d) => d.radius + 5))
      .force(
        "clusterX",
        d3.forceX((d) => groups.find((group) => group.key === d.group).anchor[0] * width).strength(0.045),
      )
      .force(
        "clusterY",
        d3.forceY((d) => groups.find((group) => group.key === d.group).anchor[1] * height).strength(0.045),
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

    if (reducedMotion) simulation.stop().tick(180);
    return () => simulation.stop();
  });
}

function renderRadial() {
  const data = {
    name: "D3",
    children: [
      { name: "Shapes", children: [{ name: "Arc", value: 34 }, { name: "Area", value: 29 }, { name: "Line", value: 32 }, { name: "Stack", value: 25 }] },
      { name: "Motion", children: [{ name: "Force", value: 39 }, { name: "Ease", value: 20 }, { name: "Timer", value: 18 }, { name: "Tween", value: 24 }] },
      { name: "Space", children: [{ name: "Pack", value: 31 }, { name: "Tree", value: 26 }, { name: "Voronoi", value: 23 }, { name: "Geo", value: 28 }] },
      { name: "Scales", children: [{ name: "Band", value: 22 }, { name: "Time", value: 30 }, { name: "Log", value: 17 }, { name: "Sequential", value: 27 }] },
    ],
  };

  fitSvg("#radial-viz", (svg, width, height) => {
    const defs = drawAtmosphere(svg, "radial", width, height, 52);
    const size = Math.min(width, height) - 58;
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    const root = d3.hierarchy(data).sum((d) => d.value || 0).sort((a, b) => b.value - a.value);

    d3.pack().size([size, size]).padding((d) => (d.depth === 0 ? 14 : 8))(root);
    const color = d3.scaleOrdinal().domain(data.children.map((d) => d.name)).range(swatches);
    const g = svg.append("g").attr("transform", `translate(${offsetX},${offsetY})`);

    g.append("circle")
      .attr("cx", size / 2)
      .attr("cy", size / 2)
      .attr("r", size / 2 - 2)
      .attr("fill", "none")
      .attr("stroke", "rgba(247,243,234,0.16)")
      .attr("stroke-dasharray", "3 9");

    const node = g
      .selectAll("g.node")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    node
      .append("circle")
      .attr("r", reducedMotion ? (d) => d.r : 0)
      .attr("fill", (d) => {
        if (d.depth === 0) return "rgba(247,243,234,0.03)";
        const group = d.depth === 1 ? d.data.name : d.parent.data.name;
        return color(group);
      })
      .attr("fill-opacity", (d) => (d.children ? 0.16 : 0.86))
      .attr("stroke", (d) => (d.depth === 0 ? "rgba(247,243,234,0.2)" : "rgba(255,255,255,0.58)"))
      .attr("stroke-width", (d) => (d.depth <= 1 ? 1.2 : 1))
      .attr("filter", (d) => (d.children ? null : defs.glow))
      .on("pointermove", (event, d) => {
        const path = d.ancestors().reverse().map((item) => item.data.name).join(" / ");
        showTooltip(event, d.data.name, `${path} - weight ${Math.round(d.value)}`);
      })
      .on("pointerleave", hideTooltip)
      .transition()
      .duration(reducedMotion ? 0 : 850)
      .delay((d) => d.depth * 80)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => d.r);

    node
      .filter((d) => d.depth === 1)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -d.r + 19)
      .attr("fill", palette.ink)
      .attr("font-size", 13)
      .attr("font-weight", 820)
      .text((d) => d.data.name);

    node
      .filter((d) => !d.children && d.r > 17)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#101114")
      .attr("font-size", (d) => Math.min(13, d.r / 3.1))
      .attr("font-weight", 850)
      .text((d) => d.data.name);

    node
      .filter((d) => d.depth === 0)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.36em")
      .attr("fill", "rgba(247,243,234,0.86)")
      .attr("font-size", Math.max(16, size * 0.045))
      .attr("font-weight", 850)
      .text("D3");
  });
}

function renderStream() {
  const keys = ["Signals", "Queries", "Views", "Flows", "Models"];
  const dataset = d3.range(56).map((i) => {
    const row = { month: i };
    keys.forEach((key, j) => {
      row[key] = 18 + Math.sin(i / (2.2 + j * 0.45) + j) * 9 + Math.cos(i / 5.4 + j * 1.65) * 7 + ((i * (j + 5)) % 14);
    });
    return row;
  });

  fitSvg("#stream-viz", (svg, width, height) => {
    drawAtmosphere(svg, "stream", width, height, 44);
    const margin = { top: 64, right: 32, bottom: 52, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const series = stack(dataset);
    const x = d3.scaleLinear().domain(d3.extent(dataset, (d) => d.month)).range([0, innerWidth]);
    const y = d3
      .scaleLinear()
      .domain([d3.min(series, (layer) => d3.min(layer, (d) => d[0])), d3.max(series, (layer) => d3.max(layer, (d) => d[1]))])
      .range([innerHeight, 0])
      .nice();
    const color = d3.scaleOrdinal().domain(keys).range(swatches);
    const area = d3
      .area()
      .curve(d3.curveCatmullRom.alpha(0.6))
      .x((d) => x(d.data.month))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]));

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat((d) => `M${d + 1}`))
      .call((axis) => axis.select(".domain").remove());

    const clipId = "stream-reveal-clip";
    svg
      .select("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", reducedMotion ? innerWidth : 0)
      .attr("height", innerHeight);

    const layerGroup = g.append("g").attr("clip-path", `url(#${clipId})`);

    const layers = layerGroup
      .append("g")
      .selectAll("path")
      .data(series)
      .join("path")
      .attr("fill", (d) => color(d.key))
      .attr("fill-opacity", 0.82)
      .attr("stroke", "rgba(13,14,16,0.52)")
      .attr("stroke-width", 1.25)
      .attr("d", area)
      .on("pointerenter", function () {
        layers.transition().duration(160).attr("fill-opacity", 0.34);
        d3.select(this).transition().duration(160).attr("fill-opacity", 0.96);
      })
      .on("pointermove", (event, d) => {
        const [mx] = d3.pointer(event, g.node());
        const month = Math.round(x.invert(mx));
        const datum = dataset[Math.max(0, Math.min(dataset.length - 1, month))];
        showTooltip(event, d.key, `Month ${datum.month + 1} - value ${Math.round(datum[d.key])}`);
      })
      .on("pointerleave", () => {
        layers.transition().duration(180).attr("fill-opacity", 0.82);
        hideTooltip();
      });

    if (!reducedMotion) {
      svg
        .select(`#${clipId} rect`)
        .transition()
        .duration(1150)
        .ease(d3.easeCubicOut)
        .attr("width", innerWidth);
    }

    const guide = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "rgba(247,243,234,0.48)")
      .attr("stroke-width", 1)
      .attr("opacity", 0);

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .on("pointermove", (event) => {
        const [mx] = d3.pointer(event, g.node());
        guide.attr("x1", mx).attr("x2", mx).attr("opacity", 1);
      })
      .on("pointerleave", () => guide.attr("opacity", 0));

    const legend = svg.append("g").attr("transform", `translate(${margin.left},${Math.max(22, margin.top - 34)})`);
    const item = legend
      .selectAll("g")
      .data(keys)
      .join("g")
      .attr("transform", (_, i) => `translate(${i * Math.min(104, innerWidth / keys.length)},0)`);

    item.append("circle").attr("r", 5).attr("fill", (d) => color(d));
    item
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", palette.ink)
      .attr("font-size", 12)
      .attr("font-weight", 720)
      .text((d) => d);
  });
}

renderHero();
renderForce();
renderRadial();
renderStream();
