(function() {
    // Create the connector object
    var myConnector = tableau.makeConnector();
    var exclude_fields = ['many2many', 'one2many', 'reference', 'many2one_reference', 'binary'];

    var types_map = {
        'datetime':tableau.dataTypeEnum.datetime,
        'date':tableau.dataTypeEnum.date,
        'char':tableau.dataTypeEnum.string,
        'monetary':tableau.dataTypeEnum.float,
        'html':tableau.dataTypeEnum.string,
        'float':tableau.dataTypeEnum.float,
        'boolean':tableau.dataTypeEnum.bool,
        'text':tableau.dataTypeEnum.string,
        'integer':tableau.dataTypeEnum.int,
        'selection':tableau.dataTypeEnum.string,


        // 'binary':tableau.dataTypeEnum.,
        // 'many2one_reference':tableau.dataTypeEnum.,
        // 'reference':tableau.dataTypeEnum.,
        // 'one2many':tableau.dataTypeEnum.,
        'many2one':tableau.dataTypeEnum.int,    
        // 'many2many':tableau.dataTypeEnum.,

    };

    function common(url, method, user, pass, db, args){
        return new Promise(function(resolve, reject) {
            $.xmlrpc({
                url: url + '/xmlrpc/2/common',
                dataType: 'jsonrpc',
                crossDomain: true,
                methodName: method,
                params: [db, user, pass, args],
                success: function(response, status, jqXHR) {
                    console.log(response);
                    resolve(response);
                },
                error: function(jqXHR, status, error) {
                    reject(error.debug)
                }
            })
        })
    }


    function exec(url, method, uid, pass, db, model, orm_method, args, kargs){
        console.log(arguments);
        return new Promise(function(resolve, reject) {
            $.xmlrpc({
                url: url + '/xmlrpc/2/object',
                dataType: 'jsonrpc',
                crossDomain: true,
                methodName: method,
                params: [db, uid, pass, model, orm_method, args, kargs],
                success: function(response, status, jqXHR) {
                    resolve(response);
                },
                error: function(jqXHR, status, error) {
                    reject(error.debug)
                }
            })
        })
    }
    
    // Define the schema
    myConnector.getSchema = function (schemaCallback) {
        var dataObj = JSON.parse(tableau.connectionData);
        var user =  tableau.username;
        var pass =  tableau.password;
        var db = dataObj.database;
        var url = dataObj.url;
        common(url, 'authenticate', user, pass, db, {}).then(function(uids) {
            var uid = uids[0]
            exec(url, 'execute_kw', uid, pass, db,
            'ir.model', 'search_read', [[['transient', '=', false]]], {'fields': ['name', 'model'], 'limit': 20}).then(function(models) {
                console.log(models);
                exec(url, 'execute_kw', uid, pass, db,
                    'ir.model.fields', 'search_read',
                    [[['model_id.transient', '=', false], ['ttype', 'not in', exclude_fields]]],
                    {'fields': ['name', 'ttype', 'field_description', 'help', 'model_id']}).then(function (fields) {
                    console.log(fields)
                    var tableSchema = models[0].map(
                        model => ({
                            id: model.model.replaceAll('.', '_'),
                            alias: model.model,
                            description: model.name,
                            columns: fields[0].filter(item => item.model_id[0] == model.id).map(
                                field => ({
                                    id: field.name,
                                    alias: field.field_description,
                                    description: field.help,
                                    dataType: types_map[field.ttype],
                                })
                            )
                        })
                    );
                    console.log(tableSchema);
                    schemaCallback(tableSchema);
                }).catch(function(error) {
                    alert(error);
                });
            }).catch(function(error) {
                alert(error);
            })
        }).catch(function(error) {
            alert(error);
        });
    };

    // Download the data
    myConnector.getData = function(table, doneCallback) {
        var dataObj = JSON.parse(tableau.connectionData);
        var user =  tableau.username;
        var pass =  tableau.password;
        var db = dataObj.database;
        var url = dataObj.url;
        common(url, 'authenticate', user, pass, db, {}).then(function(uids) {
            var uid = uids[0]
            model = table.tableInfo.alias
            exec(url, 'execute_kw', uid, pass, db, model, 'search_read', [[]],
                {'fields': table.tableInfo.columns.map(field => field.id)}).then(function (data) {
                    tableData = data[0].map(function (row) {
                        var row_data = {};
                        Object.entries(row).forEach(([key, value]) => {
                            if (Array.isArray(value)) {
                                row_data[key] = value[0]
                            } else {
                                row_data[key] = value
                            }
                          });
                        return row_data
                    });
                    table.appendRows(tableData);
                    doneCallback();
            })

        })
    };

    tableau.registerConnector(myConnector);

    // Create event listeners for when the user submits the form
    $(document).ready(function() {
        $("#submitButton").click(function() {
            var dataObj = {
                url: $('#host').val().trim(),
                database: $('#database').val().trim(),
            };
            tableau.connectionData = JSON.stringify(dataObj);
            tableau.connectionName = "Odoo";
            tableau.username =  $('#username').val().trim();
            tableau.password =  $('#userpassword').val().trim();
            tableau.submit();
        });
    });
})();
