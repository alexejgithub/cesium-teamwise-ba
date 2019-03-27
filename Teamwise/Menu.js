/*exported toggleMenu toggleMenuPanel addDataSourceOption*/
/*global initEntities modelURI Movebank NO_DATA_AVAILABLE*/

/** The central movebank access, will hold login data and study information. */
const movebank = new Movebank();

/**
 * Shows the navigation bar or hides the whole menu.
 */
function toggleMenu() {
    const navbar = document.getElementById("navbar");
    if (navbar.style.display === "block") {
        navbar.style.display = "none";
        hideMenuPanels();
    } else {
        navbar.style.display = "block";
    }
}

/**
 * Hides or shows the panel with the given id while hiding all other panels.
 * @param {string} panelId the id of the panel to show or hide
 */
function toggleMenuPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel.style.display === "block") {
        panel.style.display = "none";
    } else {
        hideMenuPanels();
        panel.style.display = "block";
    }
}

/**
 * Hides all menu panels, i.e. all DOM objects with class `"menuPanel"`.
 */
function hideMenuPanels() {
    const menuPanels =  document.getElementsByClassName("menuPanel");
    for (let i = 0, n = menuPanels.length; i < n; i++) {
        const panel = menuPanels.item(i);
        panel.style.display = "none";
    }
}


// Add the submit action for the login form.
(function () {
    const form = document.getElementById("loginForm");
    form.onsubmit = async function() {
        try {
            // Prevent clicking "login" again before this attempt is finished.
            form.submitButton.disabled = true;

            // Log in to Movebank, test whether the login credentials are valid.
            const username = form.username.value;
            const password = form.password.value;
            await movebank.login(username, password);

            // On success: change the menu (hide login, show studies), welcome
            $("#movebankLoginPanel").hide();
            $("#movebankDataPanel").show();
            $("#loggedInAs").text(username);
            alert("Welcome to TEAMWISE, " + username + "!");

            // Create the list of study entries to be shown in the scroll list.
            createStudyList(movebank.studies);
        } catch (error) {
            console.warn(error);
            alert("Login failed." + "\n\n" + error);
        } finally {
            // Clear the password field and enable the login button again.
            form.password.value = "";
            form.submitButton.disabled = false;
        }
    };

    // Set the action for the logout button.
    document.getElementById("logoutButton").onclick = function() {
        // Logout from Movebank and reset the menu.
        movebank.logout();
        $("#movebankLoginPanel").show();
        $("#movebankDataPanel").hide();
        $("#loggedInAs").html("");
    };

    /**
     * Creates a list item for every study in the list.
     * @param {Array<MovebankStudy>} studies the list of studies
     */
    function createStudyList(studies) {
        const studyList = $("#listOfStudies").empty();

        studies.forEach(study => {
            const entry = createEntry(study);
            studyList.append(entry);
        });
    }

    /**
     * Creates a list entry for the given study.
     * @param {MovebankStudy} study the study
     * @returns {HTMLLIElement} the new list item
     */
    function createEntry(study) {
        const entry = document.createElement("li");
        const label = document.createElement("label");
        const input = document.createElement("input");

        input.type = "radio";
        input.name = "study";
        input.value = study.id;
        input.onclick = event => onStudySelected(study, event.target);

        label.append(input);
        label.append(study.name);
        entry.append(label);
        return entry;
    }
})();


// Set the study filtering action for the search form.
(function() {
    const form = document.getElementById("searchForm");
    form.onsubmit = () => searchStudies(form.filter.value, form.query.value);
})();


/**
 * Adjusts the prompted study list showing only studies matching the given
 * access filter and search query.
 * @param {string} filter one of the options of the selector
 * @param {string} query a string that the name or id the studies must match
 */
async function searchStudies(filter, query) {
    try {
        let matches = 0;
        const queryWords = query.toLowerCase().split(" ");

        $("#listOfStudies").children().each((index, element) => {
            // Get the corresponding study to the list entry.
            const study = movebank.studies[index];

            // Check whether the study matches the search criteria.
            const matchFilter = filter === "all"
                    || filter === "owner" && study.i_am_owner
                    || filter === "data" && study.i_can_see_data;

            // Check whether the study matches the search query (in name or id).
            const studyName = study.name.toLowerCase();
            const matchName = queryWords.every(w => studyName.includes(w));
            const matchId = study.id.toString().startsWith(query);

            // Show an element if it passed the filter, hide the others.
            if (matchFilter && (matchName || matchId)) {
                $(element).show();
                matches++;
            } else {
                $(element).hide();
            }
        });

        console.log("Found " + matches + " studies.");
    } catch (error) {
        alert(error);
    }
}


/**
 * To be called when the selection indicator of the given study has changed.
 * @param {MovebankStudy} study the selected study
 * @param {HTMLLIElement} listEntry the list entry representing the study
 */
async function onStudySelected(study, listEntry) {
    // Remove all other animals of the previous selected study.
    const list = $("#listOfAnimals");
    list.empty();

    try {
        // Fetch the list of animals to this study.
        const animals = await study.getAnimals(movebank);

        // Create a radio button entry for every animal.
        animals.forEach(animal => {
            const entry = createEntry(animal);
            list.append(entry);
        });

        // Activate the submit button, so that the selected data can be loaded.
        document.getElementById("loadMbDataButton").disabled = false;
    } catch (error) {
        console.warn(error);

        // The list of css tags for this entry's label.
        const classList = listEntry.labels[0].classList;

        // Show a "no Data" message only if it was not already shown.
        if (!classList.contains("noData")) {
            alert(error.split("\n")[0]);
        }

        // No valid selection will be possible, deactivate the button.
        document.getElementById("loadMbDataButton").disabled = true;

        // No data can be loaded for this entry, highlight accordingly.
        if (typeof error === "string" && error.startsWith(NO_DATA_AVAILABLE)) {
            classList.add("noData");
        }
    }


    /**
     * Creates a list entry for the given animal.
     * @param {Animal} study the animal
     * @returns {HTMLLIElement} the new list item
     */
    function createEntry(animal) {
        const entry = document.createElement("li");
        const label = document.createElement("label");
        const input = document.createElement("input");

        input.type = "checkbox";
        input.name = "animals";
        input.value = animal.id;

        label.append(input);
        label.append(animal.local_identifier);
        entry.append(label);
        return entry;
    }
}

/**
 * Creates a marked up html string to be diplayed in the description box.
 * @param {MovebankStudy} study the study to describe
 * @returns {string} a description of that study
 */
function studyDescription(study) { // eslint-disable-line no-unused-vars
    const description = [];

    // These should always be available.
    description.push("<h3>", study.name, "</h3>");
    description.push("<p>", "Study-Id: ", study.id, "</p>");

    // Add various information if supplied.
    if (study.study_objective) {
        description.push("<p>", study.study_objective, "</p>");
    }
    if (study.acknowledgements) {
        description.push("<p>", study.acknowledgements, "</p>");
    }
    if (study.grants_used) {
        description.push("<p>", study.grants_used, "</p>");
    }
    if (study.citation) {
        description.push("<p>", study.citation, "</p>");
    }
    if (study.license_terms) {
        description.push("<p>", study.license_terms, "</p>");
    }

    return description.join("");
}

// Add a submit handler to the Movebank loading menu, that loads the selected
// data (from a study and an animal).
(function() {
    const form = document.getElementById("loadMbDataForm");
    form.onsubmit = async function() {
        // Get the study with the id of the checked radio button.
        const checkedStudy = parseInt(form.study.value);
        const study = movebank.studies.find(study => study.id === checkedStudy);

        // Get the animals that are checked in the list.
        const allAnimals = await study.getAnimals();
        const animals = allAnimals.filter((_a, i) => form.animals[i].checked);

        // Load the respective data.
        loadMbData(study, animals);
    };
})();

/**
 * Triggered when clicking on the load button.
 * @param {MovebankStudy} study the selected study
 * @param {Array<Animal>} animals the selected animals
 */
async function loadMbData(study, animals) {
    if (animals.length === 0) {
        alert("No animal selected");
    }

    // Wait until all requested entities are created before the data source is
    // added to the Cesium viewer.
    const dataSource = study.loadDataSource(animals, movebank);

    // Add the data source to the viewer and to the user interface.
    initEntities(dataSource, modelURI);
}

/**
 * Adds a new select option to the drop down of loaded data sources.
 * If no description is supplied, a generic entry is created.
 * @param {string} description what should be displayed in the selector
 * @param {string} collectionId the id of the data source's entity collection
 */
function addDataSourceOption(description, collectionId) {
    const select = document.getElementById("dataset");
    const option = document.createElement("option");
    option.value = collectionId;
    option.text = description || "Data source " + (select.length + 1);

    // Add the new option and make it the currently selected one.
    select.add(option, 0);
    select.value = collectionId;
}

// Add a submit action to the settings form: Save the entered Bing or Ion keys.
(function(){
    const form = document.getElementById("settingsForm");
    form.onsubmit = function() {
        const newBingKey = form.bingKey.value.trim();
        const newIonKey = form.ionKey.value.trim();

        // Override the loaded settings, if a new value is given.
        // This might have no effect to Cesium, but is needed to save them.
        if (newBingKey) {
            CONFIG.BingMapsKey = newBingKey;
        }
        if (newIonKey) {
            CONFIG.IonKey = newIonKey;
        }

        // Save the new settings.
        if (newBingKey || newIonKey) {
            saveConfig();
        }
    };
})();

/**
 * Send a request to the server to save the new configs.
 */
function saveConfig() {
    $.ajax("/config", {
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(CONFIG),
        error: req => console.warn("Could not save config.\n", req.responseText),
        success: () => console.log("Saved config:", CONFIG)
    });
}

// Sets the handler for checking / unchecking the interpolation setting box.
(function() {
    document.getElementById("interpolation").onchange = () => {
        const options = getInterpolationOptions();
        // Set the new interpolation in all entities of all data sources.
        for (let i = 0, n = viewer.dataSources.length; i < n; i++) {
            const animals = viewer.dataSources.get(i).entities.values;
            animals.forEach(entity => {
                entity.position.setInterpolationOptions(options);
            });
        }
    };
})();

/**
 * Returns the options to set the interpolation algorithm with, depending on the
 * current user settings.
 */
function getInterpolationOptions() {
    const polynomial = document.getElementById("interpolation").checked;
    const options = {};

    if (polynomial) {
        options.interpolationDegree = 5;
        options.interpolationAlgorithm = Cesium.HermitePolynomialApproximation;
    } else {
        options.interpolationDegree = 1;
        options.interpolationAlgorithm = Cesium.LinearApproximation;
    }

    return options;
}
