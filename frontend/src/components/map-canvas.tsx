import { useEffect } from "react"
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import type { Coordinates, Place } from "../types"

const markerIcon = L.divIcon({
  className: "place-marker",
  html: '<span aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const selectedIcon = L.divIcon({
  className: "place-marker place-marker-selected",
  html: '<span aria-hidden="true"></span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

function MapController({ center, selected }: { center: Coordinates; selected?: Place }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(selected ? [selected.lat, selected.lng] : [center.lat, center.lng], selected ? 16 : 14, {
      duration: 0.55,
    })
  }, [center, map, selected])
  return null
}

type Props = {
  center: Coordinates
  radiusKm: number
  places: Place[]
  selectedId: string | null
  onSelect: (place: Place) => void
}

export function MapCanvas({ center, radiusKm, places, selectedId, onSelect }: Props) {
  const selected = places.find((place) => place.id === selectedId)
  return (
    <div className="map-frame" aria-label={`${center.label} 주변 지도`}>
      <MapContainer center={[center.lat, center.lng]} zoom={14} zoomControl className="map-root">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#2d6b52", fillColor: "#8db9a4", fillOpacity: 0.08, weight: 2 }}
        />
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={selectedId === place.id ? selectedIcon : markerIcon}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            <Popup>
              <strong>{place.name}</strong><br />
              {place.distanceKm.toFixed(1)}km · {place.address}
            </Popup>
          </Marker>
        ))}
        <MapController center={center} selected={selected} />
      </MapContainer>
      <div className="map-credit">키 없이 여는 지도 · 장소 데이터 OSM</div>
    </div>
  )
}
