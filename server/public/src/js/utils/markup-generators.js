import DESCRIPTORS from "../constants/descriptors.js";
import { _capitalizeFirstLetter, _formatNumByThousand, _joinWordsArray, _pluralizeString } from "./helpers.js";

/**
 * Creates a new div element and adds the specified classes to it.
 *
 * @param {Array} classArray - An array of class names to be added to the div.
 * @return {HTMLElement} The newly created div element.
 */
function createDiv(classArray) {
	const newDiv = document.createElement("div");
	newDiv.classList.add(...classArray);
	return newDiv;
}

export const _GenerateClusterRecordMarkup = ((classList) => {
	try {
		const initContainerDiv = function () {
			return createDiv(classList);
		};

		const getClusterProps = function (propsGen, featureCollection) {
			return propsGen(featureCollection);
		};

		const generateMarkup = function (props) {
			const HTMLMarkup = `
            <div class='result-item-header flex-row-start'>
               <div class='result-item-titles flex-col-start flex-1'>
                  <a class='result-item-title' title='Geo Cluster Name' href='#' title='Geo Cluster Name'>${
							props.clusterName
						}</ac>
                  <small class='result-item-subtitle flex-row-center-btw'>
                     <svg class="locaiton-svg-icon" preserveAspectRatio="xMidYMid" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path>
                     </svg>
                     <a>${props.clusterAdminLvl3}, ${props.clusterAdminLvl2}</a>
                  </small>
               </div>
               <div class="result-item-controls flex-row-center-end">
                  <div class="btn-group">
                     <button class="btn btn-outline btn-sm dropdown-toggle" id="dropdownMenuClickableInside" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">...</button>
                     <ul class="dropdown-menu" aria-labelledby="dropdownMenuClickableInside">
                        <li><a class="dropdown-item" href="#">Copy Map Preview Link</a></li>
                        <li><a class="dropdown-item" href="#">Copy Coordinates</a></li>
                        <li><a class="dropdown-item" href="#">Open Cluster Map</a></li>
                        <li><a class="dropdown-item" href="#">Share Cluster</a></li>
                     </ul>
                  </div>
                  <input class="form-check-input result-item-checkbox" id="select_result_item_chk_25" type="checkbox" value="resultItemCheckbox25" aria-label="select result checkbox">
            </div>
            </div>
            <div class="result-item-body flex-col-start">
            <a href="#" class="admin1-name" id="cluster_gov_admin1">President ${_.startCase(
					_joinWordsArray(Object.values(props.clusterGovAdmin1))
				)}</a>
            <div class="result-item-pill">
               <span id="cluster_num_features">${props.clusterFeatsNum} Farmers</span>
               <span>•</span>
               <span id="cluster_area">${_formatNumByThousand(+props.clusterArea)} Hectares</span>
               <span>•</span>
               <span id="cluster_area">${+props.clusterArea} Cassava</span>
            </div>
            </div>
         `;
			return HTMLMarkup;
		};

		return {
			getClusterResultDiv: function (featureCollection) {
				const div = initContainerDiv();
				const clusterProps = getClusterProps(_GetClusterProps, featureCollection);
				div.innerHTML = generateMarkup(clusterProps);
				return div;
			},
		};
	} catch (clusterMarkupGenErr) {
		console.error(`clusterMarkupGenErr: ${clusterMarkupGenErr.message}`);
	}
})(["result-item", "flex-col-start"]);

export const _GenClusterModalMarkup = (() => {
	try {
		const generateMarkup = function (props) {
			const HTMLMarkup = `
            <div class="result-item-modal-controls">
               <button
                  class="btn-close btn-close-white"
                  id="result_item_modal_close_btn"
                  type="button"
                  aria-label="close"
               ></button>
            </div>
            <div class="result-item-modal-header flex-row-center-btw">
               <span>${_formatNumByThousand(+props.clusterFeatsNum)} ${_capitalizeFirstLetter(
				_pluralizeString(+props.clusterFeatsNum, DESCRIPTORS.GEOCLUSTER_FEATURE_DESCRIPTION)
			)}</span><span>${_formatNumByThousand(+props.clusterArea.toFixed(0))} ${_capitalizeFirstLetter(
				_pluralizeString(+props.clusterArea, DESCRIPTORS.GEOCLUSTERS_API_DEFAULT_LAND_AREA_UNIT)
			)}</span>
            </div>
            <div class="result-item-modal-title flex-row-center">
               <span id="modal_title">${props.clusterName}</span>
            </div>
            <div class="result-item-modal-body flex-col-center">
               <span class="modal-person-avatar">
                  <img
                     class="rounded-circle"
                     src="/src/assets/images/users/img_avatar1.png"
                     alt="Modal Avatar" />
               </span>
               <span class="modal-person-details flex-col-center">PMRO • Abdulsalam Dansuki</span>
               <span class="modal-person-contact flex-row-center-btw">
                  <span></span>
                  <span></span>
                  <span></span>
               </span>
            </div>
            <div class="result-item-modal-subtext">
               <span>
                  Primary commodity • Maize, Rice. Clay soil. No irriation. Closest PMRO
                  site 40km away. No power. Closest market 10km away. No processing
                  capability. Funded June 17, 2019. 13.3 hectares unused. 
                     <span>Last visited • 21 August, 2021.</span>
                  </span>
            </div>
            <div class="result-item-modal-footer flex-row-center-btw">
               <span>Block AGC</span>
               <span class="flex-row-center-btw">
                  <svg class="svgIcon" preserveAspectRatio="xMidYMid" viewBox="0 0 24 24">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path>
                  </svg>
                  <span>${props.clusterLocation}</span>
               </span>
            </div>
         `;
			return HTMLMarkup;
		};

		return {
			getInnerMarkup: (modalProps) => {
				return generateMarkup(modalProps);
			},
		};
	} catch (modalMarkupGenErr) {
		console.error(`modalMarkupGenErr: ${modalMarkupGenErr}`);
	}
})();

export const _getClusterMetadaMarkerMarkup = (clusterProps) => {
	try {
		const HTMLMarkup = `
         <div class= "plot-metadata-label--chunk-size"> 
            <span> ${_formatNumByThousand(+clusterProps.clusterArea.toFixed(0))} hectares </span>
            <span> ${_formatNumByThousand((+clusterProps.clusterArea * 2.47105).toFixed(0))} acres </span> 
         </div>
         <div class="metadata-label--owner-info__avg"> 
            <span> ${clusterProps.clusterName} </span>
            <span>${clusterProps.clusterFeatsNum} Farmers •
               <span>${clusterProps.clusterLocation}</span>
            </span>
         </div>
         <div class="metadata-label--turn-by-turn" id="metadata_label_turn_by_turn">
            <a href="#" role="button" title="Plot boundary turn-by-turn directions" aria-label="Plot boundary turn-by-turn directions"></a>
               <span >
                  <i id="" class="fas fa-route"></i>
               </span>
         </div>`;
		return HTMLMarkup;
	} catch (HTMLMarkupErr) {
		console.error(`HTMLMarkupErr: ${HTMLMarkupErr.message}`);
	}
};

export const _GenerateClusterFeatMarkup = (() => {
	try {
		/**
		 * Creates a new card element and adds the specified classes to it.
		 *
		 * @param {Array} classArray - An array of class names to be added to the card.
		 * @return {HTMLElement} The newly created card element.
		 */
		function createCard(classArray) {
			const newCard = document.createElement("card");
			newCard.classList.add(...classArray);
			return newCard;
		}

		const populateCardMarkup = function (props) {
			const plotAdminPhotoUrl = props.featureAdmin.admin1.imageUrl;

			const HTMLMarkup = `
            <div class="card-content-wrapper">
               <div class="card-media-wrapper">
                  <div class="feat-admin-avatar">
                     <img
                        src="${plotAdminPhotoUrl || `/assets/icons/icons8-person-48.png`}"
                        alt="Plot Owner Avatar"/>
                  </div>
               </div>
               <div class="card-text-wrapper">
                  <div class="card-text-top">
                     <div class="main-card-text">
                        <span class="feat-admin1-title flex-center justify-start">${props.featureAdmin.admin1.fullName}</span>
                        <span>${props.featureCenterLng.toFixed(6)}°E • ${props.featureCenterLat.toFixed(6)}°N</span>
                     </div>
                     <div class="card-pills">
                        <span class="flex-row-center">Plot ${props.featureIndex}</span>
                        <span class="flex-row-center">${props.featureArea} ha.</span>
                     </div>
                  </div>
                  <div class="card-text-bottom">
                     <div class="flex-row-start">
                        <span>FID</span><span>${`${props.featureAdmin.admin1.id}`.slice(0)}</span>
                     </div>
                     <div class="flex-row-start">
                        <span class="flex-row-center">VASTID</span>
                        <span id="feat_card__feat_id">${`${props.featureID}`.slice(0)}</span>
                     </div>
                  </div>
               </div>
            </div>
         `;
			return HTMLMarkup;
		};

		const populateCardDrawerMarkup = function (props) {
			const admin1 = props.featureAdmin.admin1;

			const HTMLMarkup = `
            <section class="feat-card-bio-section">

               <section class="section-1">
                  <div><span>PHONE</span><span>${admin1.phoneNo}</span></div>
                  <div><span>AGE</span><span>${admin1.age}</span></div>
               </section>

               <section class="section-2">
                  <div><span>ID TYPE</span><span>National Identity Number</span></div>
                  <div><span>ID No.</span><span>${admin1.govIdNo}</span></div>
               </section>

               <section class="section-3">
                  <div><span>ORIGIN</span><span>Oshimili South, Delta State</span></div>
                  <div>
                     <span>HOUSE ADDRESS</span
                     ><span>466 Tudun Wada, Wawa, Niger State</span>
                  </div>
               </section>

            </section>

            <section class="feat-card-funding-section">
               <section class="funding-section-1">
                  <div><span>FUNDING</span><span>Legacy Funding</span></div>
               </section>
            </section>
         `;
			return HTMLMarkup;
		};

		return {
			getClusterFeatDiv: async function (featureProps) {
				const clusterFeatCardWrapper = createDiv(["cluster-feature-wrapper"]);

				// INIT. FEAT. CARD
				const clusterFeatCard = createCard(["cluster-feature-card"]);
				clusterFeatCard.innerHTML = populateCardMarkup(featureProps);

				// INIT. FEAT. CARD DRAWER
				const featCardDrawer = createDiv(["cluster-feature-card-drawer"]);
				featCardDrawer.innerHTML = populateCardDrawerMarkup(featureProps);

				clusterFeatCardWrapper.appendChild(clusterFeatCard);
				clusterFeatCardWrapper.appendChild(featCardDrawer);

				return { clusterFeatCard, clusterFeatCardWrapper };
			},
		};
	} catch (featMarkupGenErr) {
		console.error(`featMarkupGenErr: ${featMarkupGenErr.message}`);
	}
})();

export const _getClusterFeatPopupMarkup = (props) => {
	try {
		const HTMLMarkup = `
         <div class="mapboxgl-popup-body flex-row-center">
         
            <div class="mapboxgl-popup-media-wrapper">
               <img src="${
						props.featureAdmin.admin1.imageUrl
					}" alt=Feature Admin Photo" style="max-width:100%; opacity: 1;">
            </div>
      
            <div class="mapboxgl-popup-text-wrapper">
               <span class="mapboxgl-popup-title">${props.featureAdmin.admin1.fullName}</span>
               <span>VASTID • ${props.featureID}</span>
               <span>Lat ${props.featureCenterLat.toFixed(6)}°N Lng ${props.featureCenterLng.toFixed(6)}°E </span>
            </div>      

         </div>`;

		return HTMLMarkup;
	} catch (featPopupMarkupErr) {
		console.error(`featPopupMarkupErr: ${featPopupMarkupErr.message}`);
	}
};
