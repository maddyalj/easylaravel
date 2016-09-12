
    $scope.generateLaravelMigrationFile = function (model) {
        if (typeof model === 'undefined') {
            return;
        }
        var tableColumns = '';
        var afterTableColumns = '';
        var foreigns = '';
        if (model.use_soft_deletes === true) {
            afterTableColumns += '\n            $table->softDeletes();';
        }
        angular.forEach(model.attributes, function (attribute) {
            if (attribute.isAttributeSelected() === true) {
                tableColumns += '[HIGHLIGHT]';
            }
            if (attribute.type === 'foreign') {
                tableColumns += '$table->integer(\'' + attribute.getName() + '\')->unsigned()';
                foreigns += '\n            $table->foreign(\'' + attribute.getName() + '\')->references(\'id\')->on(\'' + attribute.getReferenceTable() + '\');';
            } else if (attribute.type === 'constant') {
                tableColumns += '$table->integer(\'' + attribute.getName() + '\')'
                    + '->comment(implode(\', \', array_map(\n'
                    + '                function ($key, $constant) { return $key . \':\' . $constant; },\n'
                    + '                App\\' + model.name + '::' + attribute.getConstantName() + ',\n'
                    + '                array_keys(App\\' + model.name + '::' + attribute.getConstantName() + ')\n'
                    + '            )))';
                if (attribute.is_nullable === true) {
                    tableColumns += '->nullable()';
                }
                if (attribute.is_unique === true) {
                    tableColumns += '->unique()';
                }
                tableColumns += '->unsigned()';
            } else {
                tableColumns += '$table->' + attribute.type + '(\'' + attribute.getName() + '\''
                    + (attribute.type === 'string' && attribute.length !== '' ? ', ' + attribute.length : '')
                    + ')';
                if (attribute.is_nullable === true) {
                    tableColumns += '->nullable()';
                }
                if (attribute.is_unique === true) {
                    tableColumns += '->unique()';
                }
                if (attribute.is_unsigned === true && $scope.canAttributeBeUnsigned(attribute) === true) {
                    tableColumns += '->unsigned()';
                }
            }
            if (attribute.default !== '' && attribute.default !== undefined) {
                var defaultAttribute = attribute.default;
                if (lowercaseFilter(attribute.default) === 'null') {
                    defaultAttribute = lowercaseFilter(attribute.default);
                } else if (attribute.type === 'string' || attribute.type === 'text') {
                    defaultAttribute = '\'' + defaultAttribute + '\'';
                } else if (attribute.type === 'boolean') {
                    defaultAttribute = lowercaseFilter(attribute.default);
                }
                tableColumns += '->default(' + defaultAttribute + ')';
            }
            if (attribute.isAttributeSelected() === true) {
                tableColumns += '[/HIGHLIGHT]';
            }
            tableColumns += ';\n            ';
        });
        if (foreigns !== '') {
            afterTableColumns += '\n' + foreigns;
        }
        return $scope.templates.laravel.migration
            .replace('[[model.table|camelize]]', camelizeFilter(model.table))
            .replace('[[model.table]]', model.table)
            .replace('[[tableColumns]]', tableColumns.trim())
            .replace('[[afterTableColumns]]', afterTableColumns)
            .replace('[[model.table]]', model.table);
    };

    $scope.generateLaravelModelFile = function (model) {
        if (typeof model === 'undefined') {
            return;
        }
        var uses = '';
        var classStart = '';
        var fillable = '';
        var classEnd = '';
        var constants = '';
        var fillableArray = [];
        var hiddenArray = [];
        angular.forEach(model.attributes, function (attribute) {
            if (attribute.type === 'constant') {
                if (attribute.isAttributeSelected() === true) {
                    constants += '[HIGHLIGHT]';
                }
                constants += '    const ' + attribute.getConstantName() + ' = [\n';
                var values = attribute.values.replace(/ /g, '').split(',');
                var longest = getLongestStringLength(values);
                angular.forEach(values, function (value, i) {
                    constants += '        \'' + uppercaseFilter(value) + '\' ' + getSpaces(longest, value) + '=> ' + (i + 1) + ',\n';
                });
                constants += '    ];\n';
                if (attribute.isAttributeSelected() === true) {
                    constants += '[/HIGHLIGHT]';
                }
            }
            if (attribute.is_fillable === true) {
                fillableArray.push(attribute.getName());
            }
            if (attribute.is_hidden === true) {
                hiddenArray.push(attribute.getName());
            }
        });
        if (model.use_soft_deletes === true) {
            uses += 'use Illuminate\\Database\\Eloquent\\SoftDeletes;\n';
            classStart += '\n    use SoftDeletes;\n';
        }
        if (constants !== '') {
            classStart += '\n' + constants;
        }
        if (fillableArray.length > 0) {
            fillable += '\'' + fillableArray.join('\', \'') + '\'';
        }
        if (hiddenArray.length > 0) {
            classEnd += '    protected $hidden = [\'' + hiddenArray.join('\', \'') + '\'];\n';
        }
        return $scope.templates.laravel.model
            .replace('[[uses]]', uses)
            .replace('[[model.name]]', model.name)
            .replace('[[classStart]]', classStart)
            .replace('[[fillable]]', fillable)
            .replace('[[classEnd]]', classEnd);
    };

    // $scope.generateLaravelControllerFile = function (model) {
    //     if (typeof model === 'undefined') {
    //         return;
    //     }
    //     var variable = camelizeFilter(model.name, true);
    //     return $scope.templates.laravel.controller
    //         .replace('[[model.table|camelize]]', camelizeFilter(model.table))
    //         .replace('[[model.name]]', model.name);
    // };
    //
    // $scope.generateOldLaravelControllerFile = function (model) {
    //     if (typeof model === 'undefined') {
    //         return;
    //     }
    //     var variable = camelizeFilter(model.name, true);
    //     var methods = '';
    //     methods += 'public function get()\n'
    //         + '    {\n'
    //         + '        return ' + model.name + '::get();\n'
    //         + '    }\n\n';
    //     methods += '    public function find(' + model.name + ' $' + variable + ')\n'
    //         + '    {\n'
    //         + '        return $' + variable + ';\n'
    //         + '    }\n\n';
    //     methods += '    public function create(Request $request)\n'
    //         + '    {\n'
    //         + '        return ' + model.name + '::create($request->all());\n'
    //         + '    }\n\n';
    //     methods += '    public function update(Request $request, ' + model.name + ' $' + variable + ')\n'
    //         + '    {\n'
    //         + '        return $' + variable + '->update($request->all());\n'
    //         + '    }\n\n';
    //     methods += '    public function delete(' + model.name + ' $' + variable + ')\n'
    //         + '    {\n'
    //         + '        return $' + variable + '->delete();\n'
    //         + '    }\n\n';
    //     return $scope.templates.laravel.controller
    //         .replace('[[model.name]]', model.name)
    //         .replace('[[model.table|camelize]]', camelizeFilter(model.table))
    //         .replace('[[methods]]', methods.trim());
    // };

    // $scope.generateLaravelDatabaseSeederFile = function () {
    //     var seederCalls = '';
    //     angular.forEach($scope.models, function (model) {
    //         if (model.isSelected() === true) {
    //             seederCalls += '[HIGHLIGHT]';
    //         }
    //         seederCalls += 'factory(App\\' + model.name + '::class, ' + model.amount + ')->create();';
    //         if (model.isSelected() === true) {
    //             seederCalls += '[/HIGHLIGHT]';
    //         }
    //         seederCalls += '\n        ';
    //     });
    //     return $scope.templates.laravel.database_seeder.replace('[[seederCalls]]', seederCalls.trim());
    // };

    $scope.generateLaravelModelFactoryFile = function () {
        var factories = '';
        angular.forEach($scope.models, function (model) {
            if (model.isSelected() === true && $scope.settings.selectedAttribute === null) {
                factories += '[HIGHLIGHT]';
            }
            factories += '$factory->define(App\\' + model.name + '::class, function (Faker\\Generator $faker) {\n';
            var preDefinitions = '';
            var definitions = '    return [\n';
            var longest = getLongestStringLength(getAttributeNames(model.attributes));
            angular.forEach(model.attributes, function (attribute) {
                var definition = '';
                var fakerFormatter = '';
                if (typeof attribute.template !== 'undefined') {
                    if (typeof attribute.template.fakerFormatter !== 'undefined') {
                        fakerFormatter = attribute.template.fakerFormatter;
                    } else if (typeof attribute.template.definition !== 'undefined') {
                        var variable = camelizeFilter(attribute.name, true);
                        definition = attribute.template.definition.replace('[[variable]]', variable).replace('[[variable]]', variable);
                        if (typeof attribute.template.preDefinition !== 'undefined') {
                            preDefinitions = '    ' + attribute.template.preDefinition.replace('[[variable]]', variable) + '\n';
                        }
                    }
                } else {
                    switch (attribute.type) {
                        case 'string':
                            fakerFormatter = 'words(3, true)';
                            break;
                        case 'integer':
                            fakerFormatter = 'randomDigit';
                            break;
                        case 'foreign':
                            definition = 'function () {\n'
                                + '            return factory(App\\' + attribute.getReferenceModelName() + '::class)->create()->id;\n'
                                + '        }';
                            break;
                        case 'constant':
                            fakerFormatter = 'randomElement(App\\' + model.name + '::' + attribute.getConstantName() + ')';
                            break;
                        case 'text':
                            fakerFormatter = 'realText';
                            break;
                        case 'boolean':
                            fakerFormatter = 'boolean';
                            break;
                        default:
                    }
                }
                if (fakerFormatter !== '') {
                    definition = '$faker->' + ifTrue(attribute.is_nullable, 'optional()->') + ifTrue(attribute.is_unique, 'unique()->') + fakerFormatter;
                }
                definitions += '        ';
                if (attribute.isAttributeSelected() === true) {
                    definitions += '[HIGHLIGHT]';
                }
                definitions += '\'' + attribute.getName() + '\'' + getSpaces(longest, attribute.getName()) + ' => ' + definition;
                if (attribute.isAttributeSelected() === true) {
                    definitions += '[/HIGHLIGHT]';
                }
                definitions += ',\n';
            });
            definitions += '    ];\n';
            if (preDefinitions !== '') {
                factories += preDefinitions + '\n';
            }
            factories += definitions + '});';
            if (model.isSelected() === true && $scope.settings.selectedAttribute === null) {
                factories += '[/HIGHLIGHT]';
            }
            factories += '\n\n';
        });
        return $scope.templates.laravel.model_factory.replace('[[factories]]', factories.trim());
    };

    $scope.generateLaravelApiFile = function () {
        var apiRoutes = '';
        angular.forEach($scope.models, function (model) {
            if (model.isSelected() === true) {
                apiRoutes += '[HIGHLIGHT]';
            }
            var route = dasherizeFilter(model.table);
            var variable = camelizeFilter(model.name, true);
            var controller = camelizeFilter(model.table) + 'Controller';
            apiRoutes += 'Route::get(\'/'    + route + '\', \''                    + controller + '@get\');\n'
                   + '    Route::get(\'/'    + route + '/{' + variable + '}\', \'' + controller + '@find\');\n'
                   + '    Route::post(\'/'   + route + '\', \''                    + controller + '@create\');\n'
                   + '    Route::patch(\'/'  + route + '/{' + variable + '}\', \'' + controller + '@update\');\n'
                   + '    Route::delete(\'/' + route + '/{' + variable + '}\', \'' + controller + '@delete\');';
           if (model.isSelected() === true) {
               apiRoutes += '[/HIGHLIGHT]';
           }
           apiRoutes += '\n\n    ';
        });
        return $scope.templates.laravel.api.replace('[[apiRoutes]]', apiRoutes.trim());
    };
