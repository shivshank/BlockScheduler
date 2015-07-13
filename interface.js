var program = {
    useAnim: true,
    saving: true,
    calendar: new Calendar(new Date("August 1 " + new Date().getFullYear()),
                           new Date("June 1 " + (new Date().getFullYear()+1))),
    schedule: new Schedule("ABCDEF".split(''), [1, 2, 3, 4, 5, "Lunch", 6]),
    style: new Schedule("ABCDEF".split(''), [1, 2, 3, 4, 5, "Lunch", 6])
};

program.undo = {
};

program.save = {
    calendar: "ss-bs-calendar",
    schedule: "ss-bs-schedule",
    hash: "ss-bs-hash",
    settings: {
        planner: "ss-bs-settings-planner"
    }
};

program.planner = {
    keepEmpty: false,
    showPeriod: true
};

var tabs = {
    activeTab: null
};

tabs.switchTo = function(t) {
    // update buttons
    $("#" + t + "-button").toggleClass("tab-selected");

    $("#" + program.activeTab + "-button").toggleClass("tab-selected");

    // call the load callback
    if (tabs[t] && tabs[t].load) {
        tabs[t].load(program.calendar, program.schedule, program);
    }

    // update whats visible
    if (program.activeTab === t) {
        // do nothing, but allow the load callback to fire (see above)
        return;
    } if (program.useAnim && program.activeTab) {
        $("#" + program.activeTab).slideUp(200, "linear",
                                     function() { $("#" + t).slideDown() });
    } else if (program.useAnim) {
        // happens before there is an activeTab, like at page load
        $("#" + t).slideDown();
    } else {
        // this can fail semi-gracefully by looking for element "#null"
        $("#" + program.activeTab).hide();
        $("#" + t).show();
    }
    program.activeTab = t;

    window.location.hash = t;
};

$(window).on("hashchange", function(e) {
    tabs.switchTo(window.location.hash.slice(1));
});

tabs.tabEvent = function(e) {
    // if [this].[id] === [something]-button, switch to element [something]
    var tab = $(e.target).attr("id").toLowerCase();
    tab = tab.replace("-button", "");

    if (program.activeTab === tab) {
        tabs.switchTo("about");
    } else {
        tabs.switchTo(tab);
    }
};

var init = function() {
    tabs.schedule.tableDiv = $("#schedule-table");
    tabs.schedule.classList = $("#schedule-class-list");
    tabs.schedule.styler = $("#schedule-styler");
    tabs.schedule.radioName = "schedule-class";
    tabs.schedule.addButton = $("#schedule-class-add");

    tabs.planner.div = $("#planner");

    tabs.settings.init(program.calendar, program.schedule, program);

    tabs.calendar.init(program.calendar, program.schedule, program);
    tabs.calendar.div = $("#calendar-year");
    tabs.calendar.dayTypeSelector = $("#calendar-day-types");
    tabs.calendar.toolTipFormat = "calendar-tip";
};

var stringHashCode = function(s) {
    // from http://stackoverflow.com/q/7616461
    var hash = 0, i, chr, len;

    if (s.length == 0) return hash;

    for (i = 0, len = s.length; i < len; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

$(window).on('message', function(e) {
    // jQuery doesn't support post message so we need the originalEvent
    var data = e.originalEvent.data;
    console.log("info: received data from server");

    if (!localStorage.getItem(program.save.calendar)) {
        program.calendar.fromDataText(data);
    } else {
        console.log('info: did not load calendar becasue it is saved locally');
    }

    if (!localStorage.getItem(program.save.schedule)) {
        program.schedule.fromDataText(data);
    } else {
        console.log('info: did not load schedule because it is saved locally');
    }
});

$(window).on('unload', function(e) {
    // does not work (reliably?) in all browsers
    if (program.saving) {
        localStorage.clear();
        localStorage.setItem(program.save.calendar, program.calendar.toJSON());
        localStorage.setItem(program.save.schedule, program.schedule.toJSON());
        localStorage.setItem(program.save.settings.planner,
                             JSON.stringify(program.planner));
    }
});

$(document).ready( function() {
    var n, attr, i;

    // try to load a calendar from the server directly
    $.get( "school.txt", null, function(data) {
        console.log('info: found school.txt on server');
        window.postMessage(data, '*');
    }, "text");

    // check if local storage exists
    try {
        localStorage.setItem('localStorage-test', 'localStorage-test');
        localStorage.removeItem('localStorage-test');
    } catch (e) {
        alert("Your browser does not support saving. Update or try a different"+
              "browser, such as Chrome or Firefox.");
        program.saving = false;
    }

    // load from local storage (saving should only be false now if no Storage)
    if (program.saving) {
        i = localStorage.getItem(program.save.calendar);
        if (i) {
            console.log("info: found locally stored calendar, loading");
            program.calendar.fromJSON(i);
        }
        i = localStorage.getItem(program.save.schedule);
        if (i) {
            console.log("info: found locally stored schedule, loading");
            program.schedule.fromJSON(i);
        }
        i = localStorage.getItem(program.save.settings.planner)
        if (i) {
            i = JSON.parse(i);
            program.planner = i;
        }
    }

    // convert each main div into a selectable button
    $("#tabs").children().each( function() {
        n = $(this).attr("id");
        $(this).hide();
        n = n.charAt(0).toUpperCase() + n.slice(1);
        attr = {"class": "tab-selector", "id": n.toLowerCase() + "-button"};
        n = $("<a>", attr).text($(this).attr("data-name"));
        n.click(tabs.tabEvent);
        $("#tab-container").append(n);
    });

    init();

    if (window.location.hash) {
        tabs.switchTo(window.location.hash.slice(1));
    } else {
        tabs.switchTo("about");
    }
});
