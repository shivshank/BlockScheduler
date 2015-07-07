var program = {
    useAnim: true,
    saving: true,
    calendar: new Calendar(new Date("August 1 " + new Date().getFullYear()),
                           new Date("June 1 " + new Date().getFullYear())),
    schedule: new Schedule([1, 2, 3, 4, 5, "Lunch", 6], "ABCDEF".split()),
    style: new Schedule([1, 2, 3, 4, 5, "Lunch", 6], "ABCDEF".split())
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
};

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
    
    tabs.switchTo("about");
};

$(window).on('message', function(e) {
    // jQuery doesn't support post message so we need the originalEvent
    var data = e.originalEvent.data;
    console.log("info: received data from server");
    program.calendar.fromDataText(data);
    program.schedule.fromDataText(data);
});

$(document).ready( function() {
    var n, attr, i;
    
    // try to load a calendar from the server
    // (in the event this is hosted somewhere)
    $.get( "school.txt", null, function(data) {
        console.log('info: found school.txt on server, loading');
        window.postMessage(data, '*');
    }, "text");
    
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
});