`use strict`
import { AVG_BASE_MAP, CLUSTER_PLOTS_MAP, FEAT_DETAIL_MAP } from "../config/maps-config.js";
import { _clusterFeatPopupMarkup, _GenerateClusterFeatMarkup, _leafletMarkerMarkup } from "../avg-controllers/markup-generator.js";
import { pollAVGSettingsValues, _getDOMElements } from "../avg-controllers/ui-controller.js";
import { _getClusterFeatProps } from "../interfaces/cluster-props-adapter.js";
import { LAYER_COLORS } from "../utils/mapbox-layer-colors.js";
import { _TurfHelpers, _getBufferedPolygon, _CheckGeoJSON, _ManipulateDOM, _GeometryMath, _getUsableGeometry } from "../utils/helpers.js";
// import * as PIXI from "../../plugins/PixiJS/pixi.min.js";


const getLayerColor = (index) => {
   return LAYER_COLORS[index] ? LAYER_COLORS[index] : 'white';
};


// CREATE LINE & FILL LAYERS FROM GEOJSON POLY.
// function getMapboxClickLayer(geoJSON, {color, thickness, fillOpacity})
function getMapboxLayers(geoJSON, {featureIndex, layerId, color, thickness, fillOpacity} = {}) {
    
   let layerColor = getLayerColor(featureIndex);

   // this layerId has a correspondig featCard with an identical id
   layerId = layerId ? layerId : _CheckGeoJSON.getId(geoJSON);

   if (layerId) {

      const fillLayer = {
         // id: `gjFillLayer_${featureIndex}`,
         id: layerId,
         type: "fill",
         source: {
            type: "geojson",
            data: geoJSON,
         },
         paint: {
            "fill-color": `${color || layerColor}`,
            "fill-opacity": fillOpacity || 0.2,
         },
      }
      
      const outlineLayer = {
      
         id: `gjOutlineLayer_${layerId}`,
         type: "line",
         source: {
            type: "geojson",
            data: geoJSON,
         },
         paint: {
            "line-color": `${color || layerColor}`,
            "line-opacity": 1,
            "line-width": thickness || 1,
         },
      };
      
      return {
         fillLayer,
         outlineLayer,
      };

   } else {
      return null;
   };
   
};


// CREATE MAPBOX LAYER FOR LABELS
function getMapboxLabelLayer({labelIdx, labelText, labelPosition}) {

   const polygonLabel = {
      'id': `polygonLabel_${labelIdx}`,
      "type": "symbol",
      'source': {
         'type': 'geojson',    
         data: labelPosition
      },
      "layout": {
         // "symbol-placement": "line",
         "text-font": ["Open Sans Regular"],
         // "text-field": `Plot #${labelIdx} (${labelText})`,
         "text-field": `Plot_${labelIdx} (${labelText})`,
         "text-size": 10
      },
      "paint": {
         "text-color": "black"
      }
   }
   return polygonLabel;
};


// ADD A LAYER TO A MAPBOX MAP
function addMapboxLayer (map, layer) {
   
   if (map.getSource(layer.id)) {
      map.removeLayer(layer.id);
      map.removeSource(layer.id)
      map.addLayer(layer)

   } else {
      
      // INITIAL STATE > THERE WERE NO LAYERS ON MAP
      map.addLayer(layer)
   }

   // console.log(map.getStyle().sources);
};


// CLEAR PREV. RENDERED LAYERS
function sanitizeMapboxLayers ({map, renderedLayers=null, layerIDs=null}) {

   if (renderedLayers && renderedLayers.length > 0) {
      renderedLayers.forEach(layer => {
         if(map.getSource(layer.id)) {
            map.removeLayer(layer.id);
            map.removeSource(layer.id)
         }
      });
   }

   if (layerIDs) {
      layerIDs.forEach(layerID => {
         if(map.getSource(layerID)) {
            map.removeLayer(layerID)
            map.removeSource(layerID)
         }
      });
   }
};


// CLEAR PREV. RENDERED MARKERS
function removeMapboxMarkers (markersArray) {
   if (markersArray.length > 0) {
      for (const marker of markersArray) {
         marker.remove();
      };
   };
};


function getFeatCenter(featGeometry) {
   const lngLat = _TurfHelpers.centerOfMass(featGeometry).geometry.coordinates; // LNG-LAT FORMAT
   const latLng = [lngLat[1], lngLat[0]] // CONVERT TO LAT. LNG FORMAT
   return {
      lngLat,
      latLng,
   };
};


// EXTRACT GEOJSON DATA FROM A MAPBOX LAYER EVENT
function getMapboxLayerData(layer) {
   const layerGeoJSON = layer.features[0];
   const layerProps = _getClusterFeatProps(layerGeoJSON);
   const rops = (layerGeoJSON.properties);
   console.log(rops)
   const lngLatCenter = layer.lngLat;
   const layerGeometry = layer.features[0].geometry;
   const layerCoords = layerGeometry.coordinates[0];

   // const turfCenter = turf.centerOfMass(layerGeometry).geometry.coordinates; // LNG. LAT. FORMAT
   // const latLngCenter = [turfCenter[1], turfCenter[0]] // CONVERT TO LAT. LNG FORMAT
   const latLngCenter = getFeatCenter(layerGeometry).latLng;

   return {
      layerGeoJSON,
      layerProps,
      lngLatCenter,
      layerGeometry,
      layerCoords,
      latLngCenter,
   };
};


// FIXME > THIS NEEDS DEP. INJ.
// CALBACK FN. FOR TO SWITCH MAP STYLES
export function _switchMapboxMapLayer(evtObj) {
   var layerId = evtObj.target.id;
   CLUSTER_PLOTS_MAP.setStyle(`mapbox://styles/mapbox/${layerId}`);
};


// IIFE TO KEEP TRACK OF RENDERED MAPBOX LAYERS
const MapboxLayersController = (function() {

   try {
      
      const renderedLayers = [];
      const clickedLayers = [];

      return {
         saveLayers: function(mapboxLayer) {
            if (mapboxLayer) { renderedLayers.push(mapboxLayer) };
         },
         returnSavedLayers: function() {
            return renderedLayers;
         },
         saveClickedLayers: function(mapboxLayer) {
            if (mapboxLayer) { clickedLayers.push(mapboxLayer) };
         },
         returnClickedLayers: function() {
            return clickedLayers;
         },
         returnPrevClickedLayer: () => {
            // return clickedLayers[clickedLayers.length - 1];
            if (clickedLayers.length >= 2) {
               return clickedLayers[clickedLayers.length - 2];
            }
         }
      };

   } catch (layersControllerErr) {
      console.error(`layersControllerErr: ${layersControllerErr.message}`)
   };

})();


// KEEP TRACK OF RENDERED MAPBOX MARKERS
const MapboxMarkersController = (function() {
   const renderedMarkers = [];
   return {
      saveMarker: function(marker) {
         if (marker) { renderedMarkers.push(marker) };
      },
      returnSavedMarkers: function() {
         return renderedMarkers;
      }
   }
})();


// IIFE TO KEEP TRACK OF OPEN MAPBOX POPUPS
const MapboxPopupsController = (function() {
   const openPopups = [];
   return {
      savePopup: function(popup) {
         if (popup) openPopups.push(popup);
      },
      returnOpenPopups: function() {
         return openPopups;
      },
   };
})();


// const ClusterMarkerGroupHandler = (()=>{
   function getMarkerClusterGroup({centerDist, markerDist, zoomLimit, maxClusterRadius}) {
      const clusterGroup = L.markerClusterGroup({
         spiderfyShapePositions: function(count, centerPt) {
            var distanceFromCenter = centerDist,
               markerDistance = markerDist,
               lineLength = markerDistance * (count - 1),
               lineStart = centerPt.y - lineLength / 2,
               res = [],
               i;
   
            res.length = count;
   
            for (i = count - 1; i >= 0; i--) {
               res[i] = new Point(centerPt.x + distanceFromCenter, lineStart + markerDistance * i);
            };
   
            return res;
         }, 
         showCoverageOnHover: true,
         disableClusteringAtZoom: zoomLimit,
         maxClusterRadius: function(zoom) {
            return (zoom <= 14) ? maxClusterRadius : 1; // radius in pixels
          }, // A cluster will cover at most this many pixels from its center
      });
      return clusterGroup;
   };
//    return {
//       initMarkerClusterGroup: ({centerDist, markerDist, zoomLimit, maxClusterRadius}) => {
//          getMarkerClusterGroup
//       },
//    };
// })();


const LLayerGroupController = ((leafletBaseMap, leafletModalMap)=>{

   // Create groups to hold the leaflet layers and add it to the map
   const baseMapLayerGroup = L.layerGroup().addTo(leafletBaseMap);
   const modalMapLayerGroup = L.layerGroup().addTo(leafletModalMap);
   const baseMapMarkerClusterGroup = getMarkerClusterGroup({
      centerDist: 35,
      markerDist: 45,
      zoomLimit: 13,
      maxClusterRadius: 10
   }).addTo(leafletBaseMap);   

   return {
      getLayerGroups: () => {
         return {
            baseMapLayerGroup,
            modalMapLayerGroup,
            baseMapMarkerClusterGroup,
         };
      },
   };
})(AVG_BASE_MAP, FEAT_DETAIL_MAP);


const MapboxMaps = (()=>{
   return {
      clearPopups: () => {
         var popUps = document.getElementsByClassName("mapboxgl-popup");
         if (popUps[0]) popUps[0].remove();
         const openPopups = MapboxPopupsController.returnOpenPopups();
         openPopups.forEach(openPopup => {
            if (openPopup) openPopup.remove;
         });      
      },
   };
})();


// PAN MAP TO GEOJSON'S CENTER
function mapboxPanToGeoJSON(map, centerCoords, bounds, {zoom=16, pitch=0, bearing=0, boundsPadding=0}) {
   // PAN TO LOCATION
   map.flyTo({
		center: centerCoords,
		zoom: zoom,
      pitch: pitch,
      bearing: bearing,
		// zoom: zoomSetting,
	});
	// CONTAIN THE ZOOM TO THE SHAPEFILE'S BOUNDS
	map.fitBounds(bounds, {padding: boundsPadding});
};


// SIMPLE MAPBOX GJ. RENDER FN.
const mapboxDrawFeatFeatColl = function ({mapboxMap, featOrFeatColl}) {

   try {

      // RENDER ONLY FEATS. OR FEAT. COLLS.
      if (mapboxMap && _CheckGeoJSON.isValidFeatOrColl(featOrFeatColl)) {
   
         // CALC. SOME METADATA
         const gjUniqueID = featOrFeatColl._id;
         const gjCenterCoords = turf.coordAll(turf.centerOfMass(featOrFeatColl))[0];
         
   
         // INIT. MAPBOX LAYERS
         const gjOutlineLayer = getMapboxLayers(featOrFeatColl, {featureIndex: gjUniqueID, color: "#009432", thickness: 1, fillOpacity: null}).outlineLayer
         const gjFillLayer = getMapboxLayers(featOrFeatColl, {featureIndex: gjUniqueID, color: 'white', thickness: null, fillOpacity: 0.25}).fillLayer
         
   
         // INIT. MAPBOX MARKER
         const mapboxMarker = new mapboxgl.Marker().setLngLat(gjCenterCoords);
   
         
         // CLEAR PREVIOUSLY RENDERED LAYERS
         sanitizeMapboxLayers({map: mapboxMap, renderedLayers: MapboxLayersController.returnSavedLayers()});
         removeMapboxMarkers(MapboxMarkersController.returnSavedMarkers());
      
            
         // // PAN MAP TO GEOJSON'S CENTER

         // console.log(gjOutlineLayer)
         // console.log(gjFillLayer)
      
         
         // ADD LAYERS TO MAPBOX MAP
         addMapboxLayer(mapboxMap, gjOutlineLayer);
         addMapboxLayer(mapboxMap, gjFillLayer);
         mapboxMarker.addTo(mapboxMap);
         
         
         // SAVE THE LAYERS & MARKERS
         MapboxLayersController.saveLayers(gjOutlineLayer);
         MapboxLayersController.saveLayers(gjFillLayer);
         MapboxMarkersController.saveMarker(mapboxMarker);

         console.log(MapboxLayersController.returnSavedLayers());

      } else {
         throw new Error(`This function requires a GeoJSON Feature or FeatureCollection`)
      }
      
   } catch (mapboxGJRenderErr) {
      console.error(`mapboxGJRenderErr: ${mapboxGJRenderErr.message}`)
   }
};


// PLOT/CHUNK RENDER FUNCTION
function mapboxDrawFeature(mapboxMap, polygon, featureIdx) {

   try {
               
      // GET THE CHUNK POLYGON LAYERS
      let polygonOutlineLayer = getMapboxLayers(polygon, {featureIndex: featureIdx, color: null, thickness: 2, fillOpacity: 0.1}).outlineLayer;
      let polygonFillLayer = getMapboxLayers(polygon, {featureIndex: featureIdx, color: null, thickness: 2, fillOpacity: 0.1}).fillLayer;
      
      if (polygonOutlineLayer && polygonFillLayer) {

         // ADD THE LAYERS TO THE MAPBOX MAP
         addMapboxLayer(mapboxMap, polygonOutlineLayer);
         addMapboxLayer(mapboxMap, polygonFillLayer);
         
         // ADD INTERACTION TO THE FILL LAYER
         FillLayerHandler.interaction(mapboxMap, polygonFillLayer);
            
         // SAVE THE LAYERS
         MapboxLayersController.saveLayers(polygonOutlineLayer);
         MapboxLayersController.saveLayers(polygonFillLayer);

      } else {
         throw new Error(`Could not get Mapbox fill &/or outline layers for ${polygon}`)
      };
      
   } catch (mapboxDrawFeatErr) {
      console.error(`mapboxDrawFeatErr: ${mapboxDrawFeatErr.message}`)
   };
};


// RENDER LABELS @ CENTER OF POLYGONS
function mapboxDrawLabels(mapboxMap, polygon, featureIdx, {areaUnits=`hectares`}) {

   try {
      
      const plotIndex = featureIdx + 1;   
      const plotArea = _TurfHelpers.calcPolyArea(polygon, {units: areaUnits});
      const labelText = `${plotArea.toFixed(0)} ${areaUnits}`;
      const labelPosition = turf.centerOfMass(polygon);
      
      const labelLayer = getMapboxLabelLayer({labelIdx: plotIndex, labelText, labelPosition});
   
      addMapboxLayer(mapboxMap, labelLayer);
   
      MapboxLayersController.saveLayers(labelLayer);

   } catch (mapboxDrawLabelsErr) {
      console.error(`mapboxDrawLabelsErr: ${mapboxDrawLabelsErr.message}`)
   };
};


const leafletRenderGeojson = function (leafletBaseMap, geojson, {zoomLevel=8}) {
   const gjCenterFeature = turf.centerOfMass(geojson);
   // RE-POSITION THE LEAFLET MAP
   LeafletMaps.panToPoint(leafletBaseMap, gjCenterFeature, {zoomLevel})
};


function openMapboxFeatPopup(map, props, centerLngLat) {

   MapboxMaps.clearPopups();

   // const popup = new mapboxgl.Popup({ className: "mapbox-metadata-popup" })
   const popup = new mapboxgl.Popup({closeOnClick: true})
      .setLngLat(centerLngLat)
      .setHTML(_clusterFeatPopupMarkup(props))
      .addTo(map);

      MapboxPopupsController.savePopup(popup);

   // CREATE A CUSTOM EVENT LISTENER >> TRIGGERED BY: map.fire('closeAllPopups')
   map.on('closeAllPopups', () => {
      popup.remove();
   });
};


const getPresentationPoly = (geoJSONPoly, {useBuffer, bufferAmt, bufferUnits='kilometers'}) => {
   const presentationPolygon = useBuffer ? _getBufferedPolygon(geoJSONPoly, bufferAmt, {bufferUnits}) : geoJSONPoly;
   return presentationPolygon;
};


const LeafletMaps = ((baseMap)=>{

   // const featMarkers = [];
   const baseMapLayerGroup = LLayerGroupController.getLayerGroups().baseMapLayerGroup;
   const baseMapMarkerClusterGroup = LLayerGroupController.getLayerGroups().baseMapMarkerClusterGroup;

   const createFeatMarker = (gjFeature) => {

      const { featProps } = LeafletMaps.getFeatureData(gjFeature);
      const featCenterLatLng = [featProps.featCenterLat, featProps.featCenterLng];

      const marker = L.marker(featCenterLatLng);

      // featMarkers.push(marker);
      baseMapMarkerClusterGroup.addLayer(marker);

      return marker;
   };

   var pixiLoader = new PIXI.loaders.Loader();
   pixiLoader
      .add('marker', '/assets/icons/location.svg')
      // .add('focusCircle', '/assets/icons/placeholder.png')

   return {
      panToPoint: (gjPointFeat, {map=baseMap, zoomLevel}) => {
         const leafletGJLayer = L.geoJson();
         leafletGJLayer.addData(gjPointFeat);
         map.flyTo(leafletGJLayer.getBounds().getCenter(), zoomLevel);      
      },
      panFeatCenter: (gjFeature, {map=baseMap, zoomLevel}) => {
         const featCenter = turf.centerOfMass(gjFeature); // FIXME
         LeafletMaps.panToPoint(featCenter, {map, zoomLevel});
      },
      addPointMarker: (gjPointFeat, {map=baseMap, zoomLevel}) => {

      },
      getFeatPolyOutline: (featGeometry, {lineColor="white", lineWeight=3, lineOpacity=1}={}) => {
         const polygonOutline = L.geoJSON(featGeometry, {
            "color": lineColor, 
            "weight": lineWeight,
            "opacity": lineOpacity,
         });
         return polygonOutline;
      },
      getFeatPolyFill: (featCoords, {fillColor="green", fillOpacity=0.5}={}) => {
         // FIXME > THE COORD. SYSTEM HERE IS OFF..
         const polygonFill = L.polygon([...featCoords], {
            style: {
               fillColor: fillColor,
               fillOpacity: fillOpacity,
               color: "white",
               weight: 3,
               dashArray: '3',
               opacity: 3,
            }
         });
         return polygonFill;
      },
      getFeatureData: (feature) => {

         let featProps, featGeometry, featCoords, featCenter;

         // const refinedFeat = _getUsableGeometry(feature).refinedGeoJSON;
         const refinedFeat = feature;

         featGeometry = refinedFeat.geometry;
         featCoords = refinedFeat.geometry.coordinates;
         // featCenter = getFeatCenter(featGeometry).latLng;
         if (feature.properties) featProps = feature.properties;
         
         return {
            featProps,
            featGeometry,
            featCoords,
            featCenter,
         };
      },
      renderFeature: async (gjFeature, {map=baseMap, useBuffer, bufferAmt, bufferUnits}) => {

         switch (_TurfHelpers.getType(gjFeature)) {

            case "Point":
                  console.log("Fuck You Rita Nwaokolo");
                  createFeatMarker(gjFeature);
               break;

            case "GeometryCollection":
               throw new Error(`Cannot create marker for this feature: ${gjFeature} of type ${_TurfHelpers.getType(gjFeature)}`)      
         
            default:

               gjFeature = getPresentationPoly(gjFeature, {useBuffer, bufferAmt, bufferUnits});

               const { featGeometry, featCoords } = LeafletMaps.getFeatureData(gjFeature);

               LeafletMaps.getFeatPolyOutline(featGeometry).addTo(baseMapLayerGroup);
               // LeafletMaps.getFeatPolyFill(featCoords).addTo(baseMapLayerGroup);

               createFeatMarker(gjFeature);

               break;
         };
      },
      renderFeatureMarker__2: async (feature, {map=baseMap}) => {

         const { featCenter } = LeafletMaps.getFeatureData(feature);

         // L.marker(featCenter).addTo(baseMapLayerGroup);

         //Use canvas mode to render marker
         // var canvasIconLayer = L.canvasIconLayer({}).addTo(map);
         var canvasIconLayer = L.canvasIconLayer({}).addTo(baseMapLayerGroup);

         var icon = L.icon({
            iconUrl: '/assets/icons/location.svg',
            iconSize: [20, 18],
            iconAnchor: [10, 9]
         });

         var marker = L.marker(featCenter, { icon: icon })
            // .bindPopup("AGC")

         canvasIconLayer.addLayer(marker);

      //    L.canvasMarker(featCenter, {
      //       radius: 20,
      //       img: {
      //          url: '/assets/icons/location.svg',    //image link
      //          size: [30, 30],     //image size ( default [40, 40] )
      //          // rotate: 10,         //image base rotate ( default 0 )
      //          offset: { x: 0, y: 0 }, //image offset ( default { x: 0, y: 0 } )
      //       },
      //   }).addTo(map);

      },
      renderFeaturesMarkers__2: async (gjFeatures, {map=baseMap}) => {

         const canvasMarkers = [];

         // var canvasIconLayer = L.canvasIconLayer({}).addTo(baseMapLayerGroup);
         // var canvasIconLayer = L.canvasIconLayer({}).addTo(map);

         canvasIconLayer.addOnClickListener(function (e,data) {console.log(data)});
         canvasIconLayer.addOnHoverListener(function (e,data) {console.log(data[0].data._leaflet_id)});

         var canvasIcon = L.icon({
            iconUrl: '/assets/icons/location.svg',
            iconSize: [20, 18],
            iconAnchor: [10, 9]
         });

         for (let idx = 0; idx < gjFeatures.length; idx++) {

            const gjFeature = gjFeatures[idx];
            
            const { featCenter } = LeafletMaps.getFeatureData(gjFeature);

            // var canvasMarker = L.marker(featCenter, { icon: canvasIcon })
            // // .bindPopup("AGC")

            // canvasMarkers.push(canvasMarker);
         };

         // canvasIconLayer.addLayers(canvasMarkers);
      },
      renderFeatureMarker: async (gjFeature, {map=baseMap}) => {

         // map.attributionControl.setPosition('bottomleft');
         // map.zoomControl.setPosition('bottomright');

         // const featMarkerCoords = [];

         // for (let idx = 0; idx < gjFeatures.length; idx++) {

         //    const gjFeature = gjFeatures[idx];
            
            const { featProps } = LeafletMaps.getFeatureData(gjFeature);

            var featMarkerCoords = [featProps.featCenterLat, featProps.featCenterLng];

         //    featMarkerCoords.push(featMarkerCoord);
         // };
      
         pixiLoader.load(function(loader, resources) {

            // var textures = [resources.marker.texture];
            var texture = resources.marker.texture;
            // var focusTextures = [resources.focusCircle.texture];      

            const pixiLayer = ((markerCoords) => {

               var zoomChangeTs = null;
               var pixiContainer = new PIXI.Container();
               var innerContainer = new PIXI.particles.ParticleContainer(markerCoords.length, {vertices: true});

               innerContainer.texture = texture;
               innerContainer.baseTexture = texture.baseTexture;
               innerContainer.anchor = {x: 0.5, y: 1};

               pixiContainer.addChild(innerContainer);

               var doubleBuffering = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
               var initialScale;

               return L.pixiOverlay(function(utils, event) {

                  var zoom = utils.getMap().getZoom();
                  var container = utils.getContainer();
                  var renderer = utils.getRenderer();
                  var project = utils.latLngToLayerPoint;
                  var getScale = utils.getScale;
                  var invScale = 1 / getScale();
      
                  if (event.type === 'add') {
      
                     var origin = project([9.4699247854766355, 7.217137278865754]);
                     innerContainer.x = origin.x;
                     innerContainer.y = origin.y;
                     initialScale = invScale / 8;
                     innerContainer.localScale = initialScale	;
      
                     // for (var i = 0; i < markersLength; i++) {
                        var coords = project([...markerCoords]);
                        // our patched particleContainer accepts simple {x: ..., y: ...} objects as children:
                        innerContainer.addChild({
                           x: coords.x - origin.x,
                           y: coords.y - origin.y
                        });
                     // };
                  };

                  if (event.type === 'zoomanim') {
                     var targetZoom = event.zoom;
                     if (targetZoom >= 16 || zoom >= 16) {
                        zoomChangeTs = 0;
                        var targetScale = targetZoom >= 16 ? 1 / getScale(event.zoom) : initialScale;
                        innerContainer.currentScale = innerContainer.localScale;
                        innerContainer.targetScale = targetScale;
                     };
                     return;
                  };
      
                  if (event.type === 'redraw') {
                     var delta = event.delta;
                     if (zoomChangeTs !== null) {
                        var duration = 17;
                        zoomChangeTs += delta;
                        var lambda = zoomChangeTs / duration;
                        if (lambda > 1) {
                           lambda = 1;
                           zoomChangeTs = null;
                        };
                        lambda = easing(lambda);
                        innerContainer.localScale = innerContainer.currentScale + lambda * (innerContainer.targetScale - innerContainer.currentScale);
                     } else {
                        return;
                     };
                  };      

                  renderer.render(container);
                                 
               }, pixiContainer, {
                  doubleBuffering: doubleBuffering,
                  destroyInteractionManager: true,
               });
            })(featMarkerCoords);

            pixiLayer.addTo(baseMapLayerGroup);
         });
         
      },
      renderPixiMarker: (gjFeature, {map=baseMap}) => {

         const { featProps } = LeafletMaps.getFeatureData(gjFeature);
         const featCenterLatLng = [featProps.featCenterLat, featProps.featCenterLng];

         var loader = new PIXI.loaders.Loader();
         // loader.add('marker', '/assets/icons/location.svg');
         loader.add('marker', '/assets/icons/marker-icon.png');

         loader.load(function(loader, resources) {

            var markerTexture = resources.marker.texture;
            var markerLatLng = [...featCenterLatLng];
            var marker = new PIXI.Sprite(markerTexture);
            marker.anchor.set(0.5, 1);
      
            var pixiContainer = new PIXI.Container();
            pixiContainer.addChild(marker);
      
            var firstDraw = true;
            var prevZoom;
      
            var pixiOverlay = L.pixiOverlay(function(utils) {
               var zoom = utils.getMap().getZoom();
               var container = utils.getContainer();
               var renderer = utils.getRenderer();
               var project = utils.latLngToLayerPoint;
               var scale = utils.getScale();
      
               if (firstDraw) {
                  var markerCoords = project(markerLatLng);
                  marker.x = markerCoords.x;
                  marker.y = markerCoords.y;
               }
      
               if (firstDraw || prevZoom !== zoom) {
                  marker.scale.set(1 / scale);
               }
      
               firstDraw = false;
               prevZoom = zoom;

               renderer.render(container);
               
            }, pixiContainer);
            pixiOverlay.addTo(map);
         });
      },
      renderMarkerCluster: async ({map=baseMap}) => {

         map.addLayer(baseMapMarkerClusterGroup);
      },
      renderFeatColl: (featColl, {map=baseMap}) => {

      },
   }
})(AVG_BASE_MAP);


// RENDER GEOJSON ON DISPLAYED MAPS
export const _RenderMaps = (function(avgBaseMap, clusterFeatsMap) {

   try {

      // pan map to entire cluster
      const panToClusterFeats = (geoJSON) => {
         const gjCenterCoords = turf.coordAll(turf.centerOfMass(geoJSON))[0];
         const gjBounds = turf.bbox(geoJSON);
         mapboxPanToGeoJSON(clusterFeatsMap, gjCenterCoords, gjBounds, {zoom:16, pitch:0, bearing:0, boundsPadding:0});
      };
      
      // pan to a single cluster feat.
      const panToClusterFeat = (geoJSONFeat, {zoomLevel}) => {

         try {
            
            console.log(geoJSONFeat);
                        
            const gjCenterCoords = turf.coordAll(turf.centerOfMass(geoJSONFeat))[0];
            const gjBounds = turf.bbox(geoJSONFeat);
            // FIXME > ZOOM VALUE OVER-RIDDEN BY BOUNDS
            mapboxPanToGeoJSON(clusterFeatsMap, gjCenterCoords, gjBounds, {zoom: zoomLevel, pitch:0, bearing:0, boundsPadding:0});
            
         } catch (panClusterMapErr) {
            console.error(`panClusterMapErr: ${panClusterMapErr.message}`);
         };
      };

      const drawFeatureColl = (geojson) => {
         mapboxDrawFeatFeatColl({mapboxMap: clusterFeatsMap, featOrFeatColl: geojson});
      };

      const drawFeatures = (geojson, {useBuffer, bufferAmt, bufferUnits}) => {
         geojson.features.forEach((clusterPlot, idx) => {
            clusterPlot = getPresentationPoly(clusterPlot, {useBuffer, bufferAmt, bufferUnits});
            mapboxDrawFeature(clusterFeatsMap, clusterPlot, idx);
         });
      };

      const drawFeatureLabels = (geojson, {useBuffer, bufferUnits, bufferAmt, areaUnits}) => {
         geojson.features.forEach((clusterPlot, idx) => {
            clusterPlot = getPresentationPoly(clusterPlot, {useBuffer, bufferAmt, bufferUnits});
            mapboxDrawLabels(clusterFeatsMap, clusterPlot, idx, {areaUnits});
         });
      };
      
      // REMOVE
      // const panBaseMap__ = (geojson, {baseMapZoomLvl}) => {
      //    leafletRenderGeojson(avgBaseMap, geojson, {baseMapZoomLvl});
      // };

      const createMapboxPopup = (props, centerLngLat) => {
         openMapboxFeatPopup(clusterFeatsMap, props, centerLngLat);
      };
   
      return {
         // TODO > CHANGE "geojson" TO "featureCollection"
         renderFeatPopup: (props, centerLngLat) => {
            createMapboxPopup(props, centerLngLat);
         },         
         panClusterPlotsMap: (geojson) => {
            panToClusterFeats(geojson);
         },
         panClusterPlotsFeatMap: (geoJSONFeat, {zoomLevel}) => {
            panToClusterFeat(geoJSONFeat, {zoomLevel});
         },
         renderCluster: (geojson) => {
            drawFeatureColl(geojson);
         },
         renderClusterPlots: (geoJSON, {useBuffer, bufferUnits}) => {
            drawFeatures(geoJSON, {useBuffer, bufferAmt, bufferUnits});
         },
         renderClusterPlotLabel: (geoJSON, {useBuffer=false, bufferUnits, bufferAmt, areaUnits}) => {
            drawFeatureLabels(geoJSON, {useBuffer, bufferUnits, bufferAmt, areaUnits});
         },
         renderClusters: async (featureCollections, {useBuffer, bufferAmt, bufferUnits, zoomLevel}={}) => {
            switch (zoomLevel) {
               case 8.5:
                  
                  break;
               case 12:
                  
                  break;
            
               default:
                  break;
            }
            
            // const allFeatures = [];
            if (featureCollections.length > 0) {
               for (let idx = 0; idx < featureCollections.length; idx++) {
                  const featColl = featureCollections[idx];
                  for (let idy = 0; idy < featColl.features.length; idy++) {
                     const feature = featColl.features[idy];
                     await LeafletMaps.renderFeature(feature, {map: avgBaseMap, useBuffer, bufferAmt, bufferUnits});
                     await LeafletMaps.renderMarkerCluster({map: avgBaseMap});
                     // allFeatures.push(feature);
                     // LeafletMaps.renderFeaturesMarkers(allFeatures, {map: avgBaseMap});
                  };
               };
            };

            // if (featureCollections.length > 0) {
            //    featureCollections.forEach(featColl=>{
            //       if (featColl.features.length > 0) {
            //          featColl.features.forEach(async (feature) => {
            //             await LeafletMaps.renderFeature(feature, {map: avgBaseMap, useBuffer, bufferAmt, bufferUnits});
            //             await LeafletMaps.renderFeatureMarker(feature, {map: avgBaseMap});
            //          });
            //       };
            //    });
            // };
         },
         renderEverythingNow: (geoJSON, {baseMapZoomLvl=0, useBuffer=false, bufferUnits, bufferAmt, areaUnits}) => {
            
            // fire custom fn.
            clusterFeatsMap.fire('closeAllPopups');
            
            panToClusterFeats(geoJSON);
            // drawFeatureColl(geoJSON);
            drawFeatures(geoJSON, {useBuffer, bufferAmt, bufferUnits});
            drawFeatureLabels(geoJSON, {useBuffer, bufferUnits, bufferAmt, areaUnits});
            
            // panBaseMap__(geoJSON, {baseMapZoomLvl});
            console.log(geoJSON)
            LeafletMaps.panFeatCenter(geoJSON, {zoomLevel: baseMapZoomLvl});
         },
      };

   } catch (renderMapsErr) {
      console.error(`renderMapsErr: ${renderMapsErr.message}`)
   };   
})(AVG_BASE_MAP, CLUSTER_PLOTS_MAP);


function getLeafletPolyOutline(geometry, {lineColor="white", lineWeight=4, lineOpacity=1}={}) {
   const polygonOutline = L.geoJSON(geometry, {
      "color": lineColor,
      "weight": lineWeight,
      "opacity": lineOpacity,
   });
   return polygonOutline;
};


function getLeafletPolyFill(coords, {fillColor="green", fillOpacity=0.5}={}) {
   // FIXME > THE COORD. SYSTEM HERE IS OFF..
   const polygonFill = L.polygon([...coords], {
      style: {
         fillColor: fillColor,
         fillOpacity: fillOpacity,
         color: "white",
         weight: 3,
         dashArray: '3',
         opacity: 3,
      }
   });
   return polygonFill;
};


function createHTMLMarker(props, latLngPosition, styleClass, {draggable=true}) {
   const HTMLMarker = L.marker(latLngPosition, {
      draggable: draggable,
      icon: L.divIcon({
         className: `${styleClass}`,
         html: _leafletMarkerMarkup(props),
      }),
      zIndexOffset: 100
   })
   return HTMLMarker;
};


// TODO
function renderFeatVertices(props) {

};


const FillLayerHandler = ((leafletModalMap)=>{

   const baseMapLayerGroup = LLayerGroupController.getLayerGroups().baseMapLayerGroup;
   const modalMapLayerGroup = LLayerGroupController.getLayerGroups().modalMapLayerGroup;

   // BUILD A DATA OBJ. TO HOLD THE NAV. INFO. FOR EACH PLOT
   const FEAT_BOUNDARY_DATA = {
      feature_index: 0,
      start_coords: 0,
      vertex_pairs: [],
      vertex_bearings: [],
      vertex_deltas: [],
   };   

   try {
      
      const layerClick = (map, fillLayer) => {

         map.on(`click`, `${fillLayer.id}`, (e) => {

            const layerData = getMapboxLayerData(e);

            // // SANDBOX
            // $('#exampleModal').modal('show');
            // setInterval(() => {
            //    leafletMiniMap.invalidateSize();
            // }, 1000);
            
            _ManipulateDOM.affectDOMElement(fillLayer.id, `selected`);
            
            openMapboxFeatPopup(map, layerData.layerProps, layerData.lngLatCenter);

            // get a new mapbox layer
            const clickedLayerId = `clickedLayer_${fillLayer.id}`;
            const clickedLayer = getMapboxLayers(layerData.layerGeoJSON, {layerId: clickedLayerId, color: "black", thickness: 4, fillOpacity: .2}).fillLayer;

            // TODO > clear prev. popups
            
            // clear prev. clicked layers
            sanitizeMapboxLayers({map, renderedLayers: MapboxLayersController.returnClickedLayers()});
            
            // add clicked layer to map
            addMapboxLayer(map, clickedLayer);
            
            // KEEP TRACK OF THE CLICKED LAYER
            MapboxLayersController.saveLayers(clickedLayer);
            MapboxLayersController.saveClickedLayers(clickedLayer);

            // SHOW FEAT. DETAIL MAP CONT.
            (function showFeatDetailMapContainer(clickedLayerId) {
               
               // SANDBOX
               $('#exampleModal').modal('show');
               setInterval(() => {
                  leafletModalMap.invalidateSize();
               }, 500);
               
               const prevClickedLayer = MapboxLayersController.returnPrevClickedLayer();
               
               if (prevClickedLayer) {

                  console.log(prevClickedLayer.id)
                  console.log(MapboxLayersController.returnClickedLayers())
   
                  if (clickedLayerId === prevClickedLayer.id) {
                     sanitizeMapboxLayers({map, renderedLayers: MapboxLayersController.returnClickedLayers()});
                  };
               };     
            })(clickedLayer.id);
            
            // RENDER THE CLUSTER FEATURE  
            (function renderFeatureDetailMap(featureData, leafletMap, leafletLayerGroup) {

               // REMOVE
               // leafletMap.invalidateSize();

               if (!pollAVGSettingsValues().renderMultiFeatsChk) {
                  leafletLayerGroup.clearLayers();
               };

               const featIdx = featureData.featureIndex;
               const featProps = featureData.layerProps;
               const featCoords = featureData.layerCoords;
               const featCenter = featureData.latLngCenter;
               const featGeometry = featureData.layerGeometry;
               const featBounds = L.geoJson(featGeometry).getBounds();

               setInterval(() => {
                  // leafletMap.fitBounds(leafletLayerGroup.getBounds(), {padding: [150, 50]}); // PADDING: [L-R, T-D]
                  leafletMap.fitBounds(featBounds, {padding: [50, 80]}); // PADDING: [L-R, T-D]
               }, 1500);

               // ADD A MARKER TO PLOT CENTER
               L.marker(featureData.latLngCenter).addTo(leafletLayerGroup);

               // RENDER A LEAFLET POLYGON
               getLeafletPolyOutline(featGeometry).addTo(leafletLayerGroup);

               // FILL THE POLYGON
               getLeafletPolyFill(featCoords).addTo(leafletLayerGroup);

               // DISPLAY PLOT METADATA AT CENTER OF FEATURE
               createHTMLMarker(featProps, featCenter, 'plot-metadata-label', {draggable:true}).addTo(leafletLayerGroup);
      
               // TODO
               // renderFeatVertices()
               
               // SHOW THE DISTANCE & BEARING BTW. FARM PLOT CORNERS
               for (let idx = 0; idx < featCoords.length; idx++) {
      
                  // REFERENCE THE INDEX OF THIS PLOT
                  FEAT_BOUNDARY_DATA.feature_index = featIdx;
      
                  const plotCorner = featCoords[idx];
      
                  const fromPlotCorner = featCoords[idx];
                  const toPlotCorner = featCoords[idx + 1] === undefined ? featCoords[0] : featCoords[idx + 1]; // RETURN BACK TO STARTING CORNER
      
                  // SAVE THE CURRENT PLOT CORNERS > REMOVE THE REDUNDANT PAIR @ START POINT..
                  FEAT_BOUNDARY_DATA.vertex_pairs.push([fromPlotCorner, toPlotCorner]);
      
                  const midpoint = _TurfHelpers.midpoint(fromPlotCorner, toPlotCorner)
                  const midpointCoords = midpoint.geometry.coordinates; // TO PLACE THE DIST. LABELS
                  const distance = _TurfHelpers.distance(fromPlotCorner, toPlotCorner, {distUnits: 'kilometers'}) * 1000;
                  const turfBearing = _TurfHelpers.distance(fromPlotCorner, toPlotCorner, {distUnits: 'degrees'});
                  const mathBearing = _GeometryMath.computeBearing(fromPlotCorner, toPlotCorner);
                  const degMinSec = _GeometryMath.getDegMinSec(mathBearing); // CONVERT bearing to 0° 0' 4.31129" FORMAT    

                  // YOU ARE AT STARTING POINT WHEN BEARING === 0
                  // DON'T SHOW A MIDPOINT DIST. MARKER HERE
                  // ONLY SHOW LABELS IF DIST. BTW. VERTICES > 5.0 meters
                  if (turfBearing !== 0 && distance > 5) {
      
                     // SHOW THE PLOT VERTICES AS LEAFLET ICONS
                     // IMPORTANT 
                     // NOTE: COORDS. IN LEAFLET ARE "latLng" 
                     // NOTE: COORDS. IN MAPBOX ARE "lngLat"
                     L.marker([plotCorner[1], plotCorner[0]], {
                        icon: L.divIcon({
                           className: `plot-polygon-vertex-coords-label`,
                           html: `<span>${idx}</span> ${plotCorner[0].toFixed(6)}°N, ${plotCorner[1].toFixed(6)}°E`,
                           iconSize: [70, 15]
                        }),
                        zIndexOffset: 98
                        
                     }).addTo(leafletLayerGroup);   
      
                     // SHOW DIST. BTW. CORNERS ONLY (FOR SMALL SCREENS)
                     L.marker([midpointCoords[1], midpointCoords[0]], {
                        draggable: true,
                        icon: L.divIcon({
                           className: 'plot-polygon-vertex-dist-label',
                           html: `${distance.toFixed(0)} m`,
                           iconSize: [30, 15]
                        }),
                        zIndexOffset: 99
         
                     }).addTo(leafletLayerGroup);
                     
                     // SHOW DIST. & BEARING (FOR DESKTOP)
                     L.marker([midpointCoords[1], midpointCoords[0]], {
                        draggable: true,
                        icon: L.divIcon({
                           className: 'plot-polygon-vertex-dist-bearing-label',
                           html: `${distance.toFixed(0)} m, ${degMinSec}`,
                           iconSize: [30, 15]
                        }),
                        zIndexOffset: 99
         
                     }).addTo(leafletLayerGroup);
                     
                     // SAVE THE BEARING BTW. THE VERTICES
                     FEAT_BOUNDARY_DATA.vertex_bearings.push(mathBearing);
                     FEAT_BOUNDARY_DATA.vertex_deltas.push(distance);
      
                  } else if (turfBearing === 0) {
                     // THE BEARING == 0 => THAT CORNER IS THE PLOT "STARTING" POINT
      
                     // SAVE THE BEARING & COORDS. @ 0
                     FEAT_BOUNDARY_DATA.start_coords = plotCorner;
                     
                     // ADD AN ANIMATED MARKER
                     // leafletLayerGroup.addLayer(getAnimatedPersonMarker([plotCorner[1], plotCorner[0]]));
                  };
               };
      
               // DATA OBJ. WITH THE NAV. INFO. FOR EACH PLOT
               // console.log({...FEAT_BOUNDARY_DATA});
               
            })(layerData, leafletModalMap, modalMapLayerGroup);

         });      
      };

      const layerMouseIn = (map, fillLayer) => {

         map.on('mouseenter', `${fillLayer.id}`, function(e) {
            
            // Change the cursor to a pointer when the mouse is over the grid fill layer.
            map.getCanvas().style.cursor = 'pointer';

            _ManipulateDOM.affectDOMElement(fillLayer.id, `selected`)
            _ManipulateDOM.scrollDOMElement(fillLayer.id);         
            
         });
      };

      const layerMouseOut = (map, fillLayer) => {

         map.on('mouseleave', `${fillLayer.id}`, function() {
            
            map.getCanvas().style.cursor = '';

            _ManipulateDOM.affectDOMElement(fillLayer.id, `selected`);

         });
      };

      return {
         interaction: (map, fillLayer) => {
            layerClick(map, fillLayer);
            layerMouseIn(map, fillLayer);
            layerMouseOut(map, fillLayer);
         },
      };

   } catch (fillLayerHandlerErr) {
      console.error(`fillLayerHandlerErr: ${fillLayerHandlerErr.message}`)
   };

})(FEAT_DETAIL_MAP);


// SANDBOX > 
// AFFECT A LEAFLET MARKER FROM A SIDEBAR DIV
const AffectLeafletMarker = (() => {

   const clusterFeatsListCont = document.getElementById('cluster_feats_listing_body')
   var link = L.DomUtil.create('a', 'link', clusterFeatsListCont);
           
   link.textContent = 'Cluster Plot Owner';
   link.href = '#';
   
   var marker = new L.Marker([36.8370066107919, 10.059871561852127]).bindPopup('Popup').addTo(AVG_BASE_MAP);
   
   link.marker = marker;
   marker.link = link;
   
   L.DomEvent.addListener(link, 'mouseover', function (e) {
       e.target.marker.openPopup(); 
   });
   
   L.DomEvent.addListener(link, 'mouseout', function (e) {
       e.target.marker.closePopup(); 
   });
   
   marker.on('mouseover', function (e) {
       e.target.link.style.backgroundColor = 'pink';
   });
   
   marker.on('mouseout', function (e) {
       e.target.link.style.backgroundColor = 'white';
   });
   
})();