// Crear el mapa centrado en Santiago
const map = L.map("map").setView([-33.45, -70.65], 10);

// Capa base
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// ========== MAPA DE CALOR + ICONOS EN ZOOM ALTO ==========

let heatLayer;
const centrosLayer = L.layerGroup(); // capa con markers

fetch("datos/ubicaciones_centros_rm_limpio.csv")
  .then(response => response.text())
  .then(text => {
    const heatData = [];
    const rows = text.trim().split("\n").slice(1); // Ignorar encabezado

    rows.forEach(row => {
      const [Nombre, Comuna, Tipo, Dependencia, Latitud, Longitud] = row.split(",");
      const lat = parseFloat(Latitud);
      const lon = parseFloat(Longitud);

      // Validar que sean números y estén dentro de Chile
      if (!isNaN(lat) && !isNaN(lon) && lat < 0 && lon < 0) {
        // Heatmap
        heatData.push([lat, lon, 0.5]);

        // Marker individual
        const marker = L.circleMarker([lat, lon], {
          radius: 5,
          fillColor: "#bd0026",
          color: "#fff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9
        });

        marker.bindPopup(
          `<strong>${Nombre}</strong><br>${Tipo} (${Dependencia})<br>${Comuna}`
        );

        centrosLayer.addLayer(marker);
      }
    });

    // Crear capa de calor
    heatLayer = L.heatLayer(heatData, {
      radius: 40,
      blur: 35,
      maxZoom: 13,
      gradient: {
        0.1: "#ffffb2",
        0.3: "#fecc5c",
        0.5: "#fd8d3c",
        0.7: "#f03b20",
        1.0: "#bd0026"
      }
    }).addTo(map);

    heatLayer._canvas.style.opacity = "0.6";

    // Alternar capas según nivel de zoom
    map.on("zoomend", () => {
      const zoom = map.getZoom();
      if (zoom >= 14) {
        if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
        if (!map.hasLayer(centrosLayer)) map.addLayer(centrosLayer);
      } else {
        if (map.hasLayer(centrosLayer)) map.removeLayer(centrosLayer);
        if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
      }
    });
  });

// ========== POPUPS INVISIBLES POR COMUNA ==========

function styleComunas() {
  return {
    fillOpacity: 0,
    weight: 0,
    color: "transparent"
  };
}

fetch("datos/comunas_rm_4326.geojson")
  .then(response => response.json())
  .then(data => {
    L.geoJson(data, {
      style: styleComunas,
      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        layer.bindPopup(
          `<strong>${props.Comuna}</strong><br>
           Centros: ${props.total_centros}<br>
           Población: ${props.Poblacion}<br>
           Tasa: ${props.tasa.toFixed(1)} por cada 100.000 hab.`
        );
      }
    }).addTo(map);
  });

// ========== LEYENDA DE COLOR PARA EL HEATMAP ==========

const legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "info legend");

  // Colores y etiquetas invertidos correctamente
  const grades = [1.0, 0.7, 0.5, 0.3, 0.1];
  const colors = [
    "#bd0026",
    "#f03b20",
    "#fd8d3c",
    "#fecc5c",
    "#ffffb2"
  ];

  div.innerHTML = "<h4>Acceso a Salud</h4><div style='display: flex; flex-direction: column;'>";

  for (let i = 0; i < grades.length; i++) {
    div.innerHTML +=
      `<div style="display: flex; align-items: center;">
         <div style="width: 20px; height: 20px; background:${colors[i]}; margin-right: 6px; border: 1px solid #999;"></div>
         <span>${grades[i] > 0.7 ? "Alto" : grades[i] < 0.3 ? "Bajo" : "Medio"}</span>
       </div>`;
  }

  div.innerHTML += "</div>";
  return div;
};

legend.addTo(map);
