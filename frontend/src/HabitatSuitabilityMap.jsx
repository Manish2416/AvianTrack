import { MapContainer, TileLayer, ImageOverlay, LayersControl } from "react-leaflet";
import { Layers } from "lucide-react";

const suitabilityBounds = [
  [7.041667, 67.416667],
  [53.541667, 128.958333]
];

export default function HabitatSuitabilityMap() {
  return (
    <div className="habitat-map-wrapper">

      <MapContainer
        center={[30, 95]}
        zoom={4}
        minZoom={3}
        maxZoom={8}
        scrollWheelZoom={true}
        className="habitat-leaflet-map"
      >

        <LayersControl position="topright">

          <LayersControl.BaseLayer
            checked
            name="OpenStreetMap"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay
            checked
            name="Habitat Suitability"
          >
            <ImageOverlay
              url="/bahgoo_ensemble_suitability.png"
              bounds={suitabilityBounds}
              opacity={0.68}
              zIndex={10}
            />
          </LayersControl.Overlay>

        </LayersControl>

        <div className="habitat-map-legend">
          <div className="habitat-legend-title">
            <Layers size={15} />
            <span>Habitat suitability</span>
          </div>

          <div className="habitat-gradient"></div>

          <div className="habitat-legend-labels">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

      </MapContainer>

    </div>
  );
}
