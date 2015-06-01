var tableGrid = {
	create: function(rowWidth1, rowWidth2, rowWidthN) {
		var args = Array.prototype.slice.call(arguments),
            i, j, t;
		
        t = Object.create(tableGrid);
        t.table = $("<table>");
        t.body = $("<tbody>");
        t.body.appendTo(t.table);
        
        for (i=0; i < args.length; i+=1) {
            row = $("<tr>");
            t.body.append( row );
            for (j=0; j < args[i]; j+=1) { 
                row.append( $("<td>") );
            }
        }
        return t;
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
        this.body.children().each( function(i, v) {
            // for each table row
            x = 0;
            $(v).children().each( function(index, value) {
                // for each td
                callback($(value), $(v), x, y);
                x += 1;
            });
            y += 1;
        });
    }
};