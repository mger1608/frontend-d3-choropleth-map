const countyData = "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json";
const geoData = "https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json";

Promise.all([
  fetch(countyData).then(response => response.json()),
  fetch(geoData).then(response => response.json())
]).then(([educationData, countyTopoData]) => { 
  
  // Join the data
  const joinedData = countyTopoData.objects.counties.geometries.map(geometry => {
    const education = educationData.find(ed => ed.fips === geometry.id);
    return { ...geometry, education };
  });
  // console.log("joinedData:", joinedData);
  
  // Convert TopoJSON to GeoJSON
  const geoJsonFeatures = topojson.feature(countyTopoData, countyTopoData.objects.counties).features;
  // console.log("geoJsonFeatures:", geoJsonFeatures);
  console.log("Sample geoJsonFeature:", geoJsonFeatures[0]);
  console.log("Number of geoJsonFeatures:", geoJsonFeatures.length);

  // Set up SVG, projection, and path
  const w = 1200;
  const h = 800;
  const padding = 40; 

  const svg = d3.select("#root")
      .append("svg")
      .attr("width", w)
      .attr("height", h);

  const path = d3.geoPath();
  console.log("Sample path:", path(geoJsonFeatures[0]));

  // Color scale at least 4 color for user stories #4 and #9 //
  const minEdu = d3.min(joinedData, d => d.education?.bachelorsOrHigher || 0);
  const maxEdu = d3.max(joinedData, d => d.education?.bachelorsOrHigher || 0);
  const thresholds = d3.range(10, 101, 10);
  
  const colorScale = d3.scaleThreshold()
    .domain(thresholds) // Adjust thresholds for at least 4 ranges
    .range(d3.schemeBlues[9]); // 4+ colors 
  
  // Draw counties
  svg.selectAll("county")
    .data(geoJsonFeatures)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("d", path)
    .attr("data-fips", d => d.id) // User Story #5
    .attr("data-education", d => {
      const education = joinedData.find(j => j.id === d.id)?.education?.bachelorsOrHigher;
      return education || 0; // default if no match
    }) 
    .attr("fill", d => {
      const education = joinedData.find(j => j.id === d.id)?.education?.bachelorsOrHigher;
      // console.log(`FIPS ${d.id}: Education ${education}%, Color: ${colorScale(education || 0)}`);
      return colorScale(education || 0);
  }) 
    .on("mouseover", function(event, d) {
        const education = joinedData.find(j => j.id === d.id)?.education;
        d3.select("#tooltip")
          .style("visibility", "visible")
          .html(`<strong>${education?.area_name}, ${education?.state}: </strong>${education?.bachelorsOrHigher}%`)
          .attr("data-education", education?.bachelorsOrHigher)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select("#tooltip").style("visibility", "hidden");
      });
  
  // Legend; user stories #8 and #9
  const legendThresholds = colorScale.domain();
  const legendColors = colorScale.range();
  const numThresholds = legendThresholds.length;
  const rectWidth = 40;
  const rectHeight = 20;
  const totalLegendWidth = numThresholds * rectWidth;
  
  const legendData = legendThresholds.map((threshold, i) => ({
    threshold,
    color: legendColors[i] || legendColors[legendColors.length -1],
    label: i === 0 ? '0%' : `${threshold}%` 
  }));

  const legend = svg.append("g")
    .attr("id", "legend")
    .attr("transform", `translate(${padding}, ${h - padding})`);

  legendData.forEach((d, i) => {
    legend.append("rect")
      .attr("x", i * 50)
      .attr("y", 0)
      .attr("width", 40)
      .attr("height", 20)
      .attr("fill", d.color);

    legend.append("text")
      .attr("x", i * 50 + 20)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .text(d.label)
      .style("font-size", "12px")
      .style("fill", "#666");
  });
}).catch(error => {
  console.error("Fetch or processing error:", error.stack || error);
});
   
