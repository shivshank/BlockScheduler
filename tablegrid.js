var TableGrid = {
	create: function(height, rowWidth1, rowWidth2, rowWidthN) {
		var args = Array.prototype.slice.call(arguments),
            i, j, t;
		
        t = Object.create(TableGrid);
        t.table = $("<table>");
        t.body = $("<tbody>");
        
        for (i=0; i < height; i+=1) {
            row = $("<tr>");
            t.body.append( row );
            if (args[i+1]) {
                for (j=0; j < args[i+1]) { row.append( $("<td>") ); }
            }
        }
	},
    /** Use the first row (via cloning) for each row  */
    makeUniform: function() {
        var height = this.body.children().length,
            i, base;
        base = rows.eq(0).detach();
        this.body.empty();
        for (i=0; i < height; i+=1) {
            this.body.append( base.clone() );
        }
    },
    getTable: function() {
        return this.table;
    },
    getBody: function() {
        return this.body;
    },
    setClasses: function(tableRows, tableDatas) {
        this.table.children().addClass(tableRows).forEach( function(i, v) {
            // for each table row
            $(v).children().addClass(tableDatas);
        });
    },
    forEachCell: function(callback) {
        var x, y;
        
        y = 0;
        this.body.children().forEach( function(i, v) {
            // for each table row
            x = 0;
            $(v).forEach( function(index, value) {
                callback(x, y, $(value), $(v));
            });
        });
    }
};