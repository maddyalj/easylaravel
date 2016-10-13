'use strict';

var app = angular.module('app', ['oi.select', 'ngInflection', 'cfp.hotkeys', 'ui.bootstrap']);

app.controller('welcome', function (
    $scope, $http, $sce, orderByFilter, uppercaseFilter, lowercaseFilter, camelizeFilter, underscoreFilter, pluralizeFilter, titleizeFilter, dasherizeFilter, hotkeys
) {
    function getLongestStringLength(array, convertEmpty) {
        if (angular.isUndefined(convertEmpty)) {
            convertEmpty = false;
        }
        var length = 0;
        for (var i = 0; i < array.length; i++) {
            var element = convertEmpty === true && array[i] === '' ? 'EMPTY' : array[i];
            element = element.replace('-', '');
            if (element.length > length) {
                length = element.length;
            }
        }
        return length;
    }

    function getSpaces(longestLength, string) {
        return Array(longestLength - string.length + 1).join(' ');
    }

    $scope.getAttributeNames = function (attributes) {
        var names = [];
        if (angular.isUndefined(attributes)) {
            return names;
        }
        for (var i = 0; i < attributes.length; i++) {
            names.push(attributes[i].getAttributeName());
        }
        return names;
    }

    function ifTrue(condition, output) {
        if (condition === true) {
            return output;
        }
        return '';
    }

    function ifFalse(condition, output) {
        if (condition === false) {
            return output;
        }
        return '';
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe === 'undefined') {
            return '';
        }
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

     function unescapeHtml(unsafe) {
         if (typeof unsafe === 'undefined') {
             return '';
         }
         return unsafe
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, "\"")
              .replace(/&#039;/g, "'");
      }

      function loopThroughConstants(formatter) {
          var constants = {};
          angular.forEach($scope.models, function (model) {
              var constant = '';
              angular.forEach(model.attributes, function (attribute) {
                  if (attribute.type !== 'constant') {
                      return;
                  }
                  if (attribute.isAttributeSelected() === true) {
                      constant += '[HIGHLIGHT]';
                  }
                  constant += '            ' + attribute.getConstantName() + ': {\n';
                  var values = attribute.values.replace(/ /g, '').split(',');
                  var longest = getLongestStringLength(values, true);
                  angular.forEach(values, function (value, i) {
                      constant += '                ' + formatter(value, i === values.length - 1, i, longest);
                  });
                  constant += '            }';
                  if (attribute.isAttributeSelected() === true) {
                      constant += '[/HIGHLIGHT]';
                  }
                  constant += ',\n';
              });
              if (constant !== '') {
                  constants[model.name] = constant.substr(0, constant.length - 2);
              }
          });
          var output = '';
          angular.forEach(constants, function (constant, model) {
              output += model + ': {\n' + constant + '\n        }';
          });
          return output;
      };

      $scope.getAngularConstants = function () {
          return loopThroughConstants(function (value, isLast, count, longest) {
              var variable = value === '' ? 'EMPTY' : value.replace('-', '');
              return uppercaseFilter(variable) + ': '
                  + getSpaces(longest, variable) + (count + 1)
                  + (isLast === true ? '' : ',') + '\n';
          });
      };

      $scope.getAngularLabels = function () {
          return loopThroughConstants(function (value, isLast, count, longest) {
              return (count + 1) + ': '
                  + '\'' + (value === '' ? value : titleizeFilter(value)) + '\''
                  + (isLast === true ? '' : ',') + '\n';
          });
      };

     $scope.executeCopy = function (text) {
         text = unescapeHtml(text.toString().replace(/<span.*?>/g, '').replace(/<\/span>/g, ''));
         var input = document.createElement('textarea');
         document.body.appendChild(input);
         input.value = text;
         input.focus();
         input.select();
         document.execCommand('Copy');
         input.remove();
     }

    $scope.modelClicked = function ($index) {
        $scope.settings.selectedAttribute = null;
        if ($scope.settings.selectedModel === $index) {
            $scope.settings.selectedModel = null;
        } else {
            $scope.settings.selectedModel = $index;
        }
        $scope.regeneratePreview();
    };

    $scope.attributeClicked = function ($index) {
        if ($scope.settings.selectedAttribute === $index) {
            $scope.settings.selectedAttribute = null;
        } else {
            $scope.settings.selectedAttribute = $index;
        }
        $scope.regeneratePreview();
    };

    $scope.regeneratePreview = function () {
        var codeType = $scope.settings.codeView.substr(0, $scope.settings.codeView.indexOf('_'));
        var filename = $scope.settings.codeView.substr($scope.settings.codeView.indexOf('_') + 1);
        var code = $scope.templates[codeType][filename].replace(/\[% for m '(.*)' %\]([.\s\S]*?)\[% endfor m %\]/g, function (match, glue, body) {
            var result = '';
            for (var i = 0; i < $scope.models.length; i++) {
                $scope.models[i].updateLongestLength();
                var data = {
                    m: $scope.models[i],
                };
                angular.extend(data, $scope);
                result += body.trim().replace(/\[% for a '(.*)' %\]([.\s\S]*?)\[% endfor a %\]/g, function (match, glue, body) {
                    var attributesResult = '';
                    for (var j = 0; j < data.m.attributes.length; j++) {
                        data.a = data.m.attributes[j];
                        attributesResult += body.trim().replace(/\[\[ (.*?) \]\]/g, function (match, expression) {
                            return $scope.$eval(expression, data);
                        });
                        if (j < data.m.attributes.length - 1) {
                            attributesResult += glue.replace('\\n', '\n').replace('\\n', '\n');
                        }
                    }
                    return attributesResult;
                }).replace(/\[\[ (.*?) \]\]/g, function (match, expression) {
                    return $scope.$eval(expression, data);
                });
                if (i < $scope.models.length - 1) {
                    result += glue.replace('\\n', '\n').replace('\\n', '\n');
                }
            }
            return result;
        }).replace(/\[\[ (.*?) \]\]/g, function (match, expression) {
            var data = angular.extend({}, $scope);
            if (expression.indexOf('model.') !== -1) {
                data.model = $scope.models[$scope.settings.selectedModel];
            }
            if (expression === 'JSON.stringify(models)') {
                return angular.toJson($scope.models, 4);
            }
            return $scope.$eval(expression, data);
        });
        $scope.previewCode = $sce.trustAsHtml(
            escapeHtml(code)
                .replace(/\[HIGHLIGHT\]/g, '<span class="highlighted-text">')
                .replace(/\[\/HIGHLIGHT\]/g, '</span>')
        );
        // var generateMethod = 'generate' + camelizeFilter($scope.settings.codeView) + 'File';
        // $scope.previewCode = $sce.trustAsHtml(
        //     escapeHtml($scope[generateMethod]($scope.models[$scope.settings.selectedModel]))
        //         .replace('[HIGHLIGHT]', '<span class="highlighted-text">')
        //         .replace('[/HIGHLIGHT]', '</span>')
        // );
    };

    $scope.loadModelClicked = function (model) {
        model = angular.copy(model);
        model.order = $scope.models[$scope.models.length - 1].order + 10;
        var length = $scope.models.push(model);
        $scope.settings.selectedModel = length - 1;
    };

    $scope.newModelClicked = function ($index) {
        angular.forEach($scope.models, function (model, i) {
            if (i > $index) {
                model.order += 10;
            }
        });
        $scope.newModel.order = $scope.models[$index].order + 10;
        $scope.models.splice($index + 1, 0, angular.copy($scope.newModel));
        $scope.settings.selectedModel = $index + 1;
    };

    $scope.removeModelClicked = function ($index) {
        if ($scope.models.length === 1) {
            $scope.resetClicked();
            return;
        }
        $scope.models.splice($index, 1);
        if ($scope.settings.selectedModel > $scope.models.length - 1) {
            $scope.settings.selectedModel = $scope.models.length - 1;
        }
    };

    $scope.saveModelClicked = function (model) {
        $scope.elSavedModels.push(angular.copy(model));
        localStorage['elSavedModels'] = JSON.stringify($scope.elSavedModels);
    };

    $scope.modelIsPivotClicked = function (model) {
        if (model.is_pivot === true) {
            model.define_route_all = false;
            model.per_page = null;
            model.define_route_find = false;
            model.define_route_create = false;
            model.define_route_update = false;
            model.define_route_delete = false;
        }
    };

    $scope.newAttributeClicked = function (model, $index) {
        angular.forEach(model.attributes, function (attribute, i) {
            if (i > $index) {
                attribute.order += 10;
            }
        });
        $scope.newModelAttribute.order = model.attributes[$index].order + 10;
        model.attributes.splice($index + 1, 0, angular.copy($scope.newModelAttribute));
        $scope.settings.selectedAttribute = $index + 1;
    };

    $scope.removeAttributeClicked = function ($modelIndex, $attributeIndex) {
        if ($scope.models[$modelIndex].attributes.length === 1) {
            $scope.models[$modelIndex].attributes[0] = angular.copy($scope.newModelAttribute);
        } else {
            $scope.models[$modelIndex].attributes.splice($attributeIndex, 1);
            $scope.settings.selectedAttribute--;
        }
        if ($scope.settings.selectedAttribute < 0) {
            $scope.settings.selectedAttribute = 0;
        }
    };

    $scope.downloadClicked = function () {
        var zip = new JSZip();
        var root = zip.folder('easyapp');
        var map = {
            'laravel_database_seeder': root.folder('database/seeds'),
            'laravel_model_factory': root.folder('database/factories'),
            'laravel_api': root.folder('routes'),
            'angular_main': root.folder('resources/assets/js'),
            'angular_elobject': root,
        };
        angular.forEach(map, function (dir, file) {
            $scope.settings.codeView = file;
            $scope.regeneratePreview();
            var code = unescapeHtml($scope.previewCode.toString().replace(/<span.*?>/g, '').replace(/<\/span>/g, ''));
            var name = file.replace('laravel_', '').replace('angular_', '');
            var name = file.indexOf('laravel_') === 0 ? camelizeFilter(name) : name;
            var extension = file.indexOf('laravel_') === 0 ? 'php' : file === 'angular_elobject' ? 'json' : 'js';
            dir.file(name + '.' + extension, code);
        });
        angular.forEach($scope.models, function (model, i) {
            map = {
                'laravel_migration': root.folder('database/migrations'),
                'laravel_controller': root.folder('app/Http/Controllers'),
                'laravel_model': root.folder('app'),
                'angular_service': root.folder('resources/assets/js/services'),
                'angular_controller': root.folder('resources/assets/js/controllers'),
                'angular_html': root.folder('public/html'),
            };
            if (model.hasAPIRoutes === false) {
                delete map['laravel_controller'];
                delete map['angular_service'];
                delete map['angular_controller'];
                delete map['angular_html'];
            }
            $scope.settings.selectedModel = i;
            angular.forEach(map, function (dir, file) {
                $scope.settings.codeView = file;
                $scope.regeneratePreview();
                var code = unescapeHtml($scope.previewCode.toString().replace(/<span.*?>/g, '').replace(/<\/span>/g, ''));
                var name = file.replace('laravel_', '').replace('angular_', '');
                if (file === 'laravel_migration') {
                    name = i + '_create_' + model.table + '_table';
                } else if (file === 'laravel_controller') {
                    name = camelizeFilter(model.table) + 'Controller';
                } else if (file === 'laravel_model') {
                    name = model.name;
                } else if (file === 'angular_service') {
                    name = dasherizeFilter(model.name) + '.service';
                } else if (file === 'angular_controller') {
                    name = dasherizeFilter(model.table) + '.controller';
                } else if (file === 'angular_html') {
                    name = dasherizeFilter(model.table);
                }
                var extension = file.indexOf('laravel_') === 0 ? 'php' : file === 'angular_html' ? 'html' : 'js';
                dir.file(name + '.' + extension, code);
            });
        });
        zip.generateAsync({type: 'blob'}).then(function (content) {
            saveAs(content, 'easyapp.zip');
        });
    };

    $scope.saveClicked = function () {
        localStorage['elModels'] = JSON.stringify($scope.models);
    };

    $scope.loadClicked = function () {
        $scope.models = JSON.parse(prompt('elobject'));
    };

    $scope.resetClicked = function () {
        $scope.settings.selectedModel = 0;
        $scope.settings.selectedAttribute = null;
        $scope.models = [];
        $scope.models.push(angular.copy($scope.newModel));
    };

    $scope.modelNameChanged = function ($index) {
        $scope.models[$index].name = camelizeFilter($scope.models[$index].name);
        $scope.models[$index].table = underscoreFilter(pluralizeFilter($scope.models[$index].name));
    };

    $scope.attributeTemplateChanged = function (attribute) {
        attribute.name = attribute.template.name;
        angular.forEach(attribute.template.attributes, function (value, key) {
            attribute[key] = value;
        });
    };

    $scope.attributeValuesChanged = function (attribute) {
        attribute.values = uppercaseFilter(attribute.values);
    };

    $scope.modelOrderBlurred = function (model) {
        model.order = parseInt(model.order);
        $scope.models = orderByFilter($scope.models, 'order');
    };

    $scope.attributeOrderBlurred = function (model, attribute) {
        attribute.order = parseInt(attribute.order);
        model.attributes = orderByFilter(model.attributes, 'order');
    };

    $scope.canAttributeBeUnsigned = function (attribute) {
        return attribute.type === 'integer' || attribute.type === 'decimal';
    };

    $scope.settings = {
        view: 'detailed',
        codeView: 'laravel_migration',
        selectedModel: null,
        selectedAttribute: null,
        lastActiveElement: null,
    };
    $scope.attributeTypeOptions = [
        'string',
        'integer',
        'foreign',
        'constant',
        'text',
        'boolean',
        'date',
        'time',
    ];

    $scope.newModelAttribute = {
        order: 10,
        name: '',
        type: 'string',
        is_fillable: true,
        is_hidden: false,
        is_nullable: false,
        is_unique: false,
        has_default: false,
        default: '',
        is_unsigned: true,
        length: '',
        values: '',
    };
    $scope.newModelAttribute.__proto__.getReferenceModelName = function () {
        var referenceModel = $scope.models[this.referenceTable];
        return typeof referenceModel === 'undefined' ? '' : referenceModel.name;
    };
    $scope.newModelAttribute.__proto__.getReferenceTable = function () {
        var referenceModel = $scope.models[this.referenceTable];
        return typeof referenceModel === 'undefined' ? '' : referenceModel.table;
    };
    $scope.newModelAttribute.__proto__.getAttributeName = function () {
        if (this.type === 'foreign') {
            return underscoreFilter(this.getReferenceModelName()) + '_id';
        }
        return this.name;
    };
    $scope.newModelAttribute.__proto__.getModelType = function () {
        if (this.type === 'foreign' || this.type === 'constant') {
            return 'integer';
        }
        return this.type;
    };
    $scope.newModelAttribute.__proto__.getConstantName = function () {
        return uppercaseFilter(pluralizeFilter(this.getAttributeName()));
    };
    $scope.newModelAttribute.__proto__.isAttributeSelected = function () {
        var model = $scope.models[$scope.settings.selectedModel];
        if (typeof model === 'undefined') {
            return false;
        }
        return this === model.attributes[$scope.settings.selectedAttribute];
    };
    $scope.newModelAttribute.__proto__.getDefaultValueForAttribute = function () {
        if (lowercaseFilter(this.default) === 'null') {
            return lowercaseFilter(this.default);
        } else if (this.type === 'string' || this.type === 'text') {
            return '\'' + this.default + '\'';
        } else if (this.type === 'boolean') {
            return lowercaseFilter(this.default);
        }
        return this.default;
    };
    $scope.newModelAttribute.__proto__.getDefinition = function (model) {
        var definition = '';
        var fakerFormatter = '';
        if (typeof this.template !== 'undefined') {
            if (typeof this.template.fakerFormatter !== 'undefined') {
                fakerFormatter = this.template.fakerFormatter;
            } else if (typeof this.template.definition !== 'undefined') {
                var variable = camelizeFilter(this.name, true);
                definition = this.template.definition.replace('[[variable]]', variable).replace('[[variable]]', variable);
            }
        }
        if (definition === '' && fakerFormatter === '') {
            switch (this.type) {
                case 'string':
                    fakerFormatter = 'words(3, true)';
                    break;
                case 'integer':
                    fakerFormatter = 'randomDigit';
                    break;
                case 'foreign':
                    definition = 'function () {\n'
                        + '            return factory(App\\' + this.getReferenceModelName() + '::class)->create()->id;\n'
                        + '        }';
                    break;
                case 'constant':
                    fakerFormatter = 'randomElement(App\\' + model.name + '::' + this.getConstantName() + ')';
                    break;
                case 'text':
                    fakerFormatter = 'realText';
                    break;
                case 'boolean':
                    fakerFormatter = 'boolean';
                    break;
                case 'date':
                    fakerFormatter = 'date';
                    break;
                case 'time':
                    fakerFormatter = 'time';
                    break;
                default:
            }
        }
        if (fakerFormatter !== '') {
            definition = '$faker->' + ifTrue(this.is_nullable && !this.is_unique, 'optional()->') + ifTrue(this.is_unique, 'unique()->') + fakerFormatter;
        }
        return definition;
    };
    $scope.newModelAttribute.__proto__.getSpaces = function (model) {
        return Array(model.getLongestLength() - this.getAttributeName().length + 1).join(' ');
    };

    $scope.newModel = {
        order: 10,
        name: '',
        table: '',
        is_pivot: false,
        use_soft_deletes: true,
        amount: 100,
        define_route_all: true,
        per_page: null,
        define_route_find: true,
        define_route_create: true,
        define_route_update: true,
        define_route_delete: true,
        attributes: [angular.copy($scope.newModelAttribute)],
    };
    $scope.newModel.__proto__.isSelected = function () {
        if (typeof this.attributes === 'undefined') {
            return this.isAttributeSelected();
        }
        return this === $scope.models[$scope.settings.selectedModel];
    };
    $scope.newModel.__proto__.h = function () {
        return this.isSelected() === true ? '[HIGHLIGHT]' : '';
    };
    $scope.newModel.__proto__.hE = function () {
        return this.isSelected() === true ? '[/HIGHLIGHT]' : '';
    };
    $scope.newModel.__proto__.getPreDefinitions = function () {
        var preDefinitions = '';
        angular.forEach(this.attributes, function (attribute) {
            if (angular.isDefined(attribute.template) === true && angular.isDefined(attribute.template.preDefinition) === true) {
                preDefinitions += attribute.template.preDefinition.replace('[[variable]]', camelizeFilter(attribute.name, true)) + '\n    ';
            }
        })
        if (preDefinitions !== '') {
            preDefinitions = preDefinitions.trim() + '\n\n    ';
        }
        return preDefinitions;
    };
    var longestLengths = {};
    $scope.newModel.__proto__.updateLongestLength = function () {
        var attributeNames = $scope.getAttributeNames(this.attributes);
        if (this.name === 'User') {
            attributeNames.push('remember_token');
        }
        longestLengths[this.name] = getLongestStringLength(attributeNames);
    };
    $scope.newModel.__proto__.getLongestLength = function () {
        return typeof longestLengths[this.name] === 'undefined' ? null : longestLengths[this.name];
    };
    $scope.newModel.__proto__.getModelFileConstants = function () {
        var output = '';
        angular.forEach(this.attributes, function (attribute) {
            if (attribute.type !== 'constant') {
                return;
            }
            if (output === '') {
                output = '\n';
            }
            if (attribute.isAttributeSelected() === true) {
                output += '[HIGHLIGHT]';
            }
            output += '    const ' + attribute.getConstantName() + ' = [\n';
            var values = attribute.values.replace(/ /g, '').split(',');
            var longest = getLongestStringLength(values, true);
            angular.forEach(values, function (value, i) {
                value = value === '' ? 'EMPTY' : value.replace('-', '');
                output += '        \'' + uppercaseFilter(value) + '\' ' + getSpaces(longest, value) + '=> ' + (i + 1) + ',\n';
            });
            output += '    ];\n';
            if (attribute.isAttributeSelected() === true) {
                output += '[/HIGHLIGHT]';
            }
        });
        return output;
    };
    $scope.newModel.__proto__.getModelExternalUses = function () {
        var uses = [];
        if (this.name === 'User') {
            uses.push('use Illuminate\\Notifications\\Notifiable;');
            uses.push('use Illuminate\\Foundation\\Auth\\User as Authenticatable;');
        } else {
            uses.push('use Illuminate\\Database\\Eloquent\\Model;');
        }
        if (this.use_soft_deletes === true) {
            uses.push('use Illuminate\\Database\\Eloquent\\SoftDeletes;');
        }
        return uses.join('\n');
    };
    $scope.newModel.__proto__.getModelUses = function () {
        var uses = [];
        if (this.name === 'User') {
            uses.push('use Notifiable;');
        }
        if (this.use_soft_deletes === true) {
            uses.push('use SoftDeletes;');
        }
        if (uses.length === 0) {
            return '';
        }
        return '\n    ' + uses.join('\n    ') + '\n';
    };
    $scope.newModel.__proto__.hasHidden = function () {
        if (this.name === 'User') {
            return true;
        }
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].is_hidden === true) {
                return true;
            }
        }
        return false;
    };
    $scope.newModel.__proto__.getHidden = function () {
        var hidden = [];
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].is_hidden === true) {
                hidden.push(this.attributes[i].name);
            }
        }
        if (this.name === 'User') {
            hidden.push('remember_token');
        }
        return hidden.join('\', \'');
    };
    $scope.newModel.__proto__.hasCasts = function () {
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].type === 'boolean') {
                return true;
            }
        }
        return false;
    };
    $scope.newModel.__proto__.getCasts = function () {
        var hidden = [];
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].type === 'boolean') {
                hidden.push(this.attributes[i].name);
            }
        }
        return hidden.join('\' => \'boolean\', \'');
    };
    $scope.newModel.__proto__.getTableColumns = function () {
        var model = this;
        var tableColumns = [];
        angular.forEach(this.attributes, function (attribute) {
            var tableColumn = attribute.h() + '$table->' + attribute.getModelType() + '(\'' + attribute.getAttributeName() + '\'';
            if (attribute.type === 'string' && attribute.length !== '') {
                tableColumn += ', ' + attribute.length;
            } else if (attribute.type === 'constant') {
                tableColumn += '->comment(implode(\', \', array_map(\n'
                    + '                function ($key, $constant) { return $key . \':\' . $constant; },\n'
                    + '                App\\' + model.name + '::' + attribute.getConstantName() + ',\n'
                    + '                array_keys(App\\' + model.name + '::' + attribute.getConstantName() + ')\n'
                    + '            )))';
            }
            tableColumn += ')';
            if (attribute.is_nullable === true) {
                tableColumn += '->nullable()';
            }
            if (attribute.is_unique === true) {
                tableColumn += '->unique()';
            }
            if (attribute.type === 'foreign' || attribute.type === 'constant' || attribute.is_unsigned === true && $scope.canAttributeBeUnsigned(attribute) === true) {
                tableColumn += '->unsigned()';
            }
            if (attribute.default !== '' && attribute.default !== undefined) {
                tableColumn += '->default(' + attribute.getDefaultValueForAttribute() + ')';
            }
            tableColumn += ';' + attribute.hE();
            tableColumns.push(tableColumn);
        });
        if (model.name === 'User') {
            tableColumns.push('$table->rememberToken();');
        }
        return tableColumns.join('\n            ');
    };
    $scope.newModel.__proto__.getForeignKeys = function () {
        var foreigns = '';
        angular.forEach(this.attributes, function (attribute) {
            if (attribute.type !== 'foreign') {
                return;
            }
            foreigns += '\n            $table->foreign(\'' + attribute.getAttributeName() + '\')->references(\'id\')->on(\'' + attribute.getReferenceTable() + '\');';
        });
        return foreigns !== '' ? foreigns + '\n' : '';
    };
    $scope.newModel.__proto__.isLastElement = function (array) {
        return array.indexOf(this) === array.length - 1;
    };
    $scope.newModel.__proto__.hasAPIRoutes = function (array) {
        return this.define_route_all === true || this.per_page > 0 || this.define_route_find === true || this.define_route_create === true || this.define_route_update === true || this.define_route_delete === true
    };
    $scope.newModel.__proto__.getRelationMethods = function () {
        var methods = [];
        var referenced = this.getReferencedTablesOfModel();
        for (var i = 0; i < referenced.length; i++) {
            var referenceModel = $scope.models[referenced[i]].name;
            methods.push('    public function ' + camelizeFilter(referenceModel, true) + '()\n    {\n        return $this->belongsTo(\'App\\' + referenceModel + '\');\n    }');
        }
        var current = parseInt($scope.models.indexOf(this));
        for (var i = current + 1; i < $scope.models.length; i++) {
            var referenced = $scope.models[i].getReferencedTablesOfModel();
            if ($scope.models[i].is_pivot === true && referenced.indexOf(current + '') !== -1) {
                for (var j = 0; j < referenced.length; j++) {
                    if (parseInt(referenced[j]) === current) {
                        continue;
                    }
                    var nonForeignAttributes = $scope.models[i].getNonForeignAttributes();
                    if (nonForeignAttributes.length > 0) {
                        nonForeignAttributes = '->withPivot(\'' + nonForeignAttributes.join('\', \'') + '\')';
                    } else {
                        nonForeignAttributes = '';
                    }
                    var referenceModel = $scope.models[referenced[j]].name;
                    methods.push('    public function ' + camelizeFilter($scope.models[referenced[j]].table, true) + '()\n    {\n        return $this->belongsToMany(\'App\\' + referenceModel + '\', \'' + $scope.models[i].table + '\')' + nonForeignAttributes + ';\n    }');
                    break;
                }
                continue;
            }
            for (var j = 0; j < referenced.length; j++) {
                if (parseInt(referenced[j]) !== current) {
                    continue;
                }
                var referenceModel = $scope.models[i].name;
                methods.push('    public function ' + camelizeFilter($scope.models[i].table, true) + '()\n    {\n        return $this->hasMany(\'App\\' + referenceModel + '\');\n    }');
                break;
            }
        }
        return methods.length > 0 ? '\n' + methods.join('\n\n') + '\n' : '';
    };
    $scope.newModel.__proto__.getReferencedTablesOfModel = function () {
        var referenced = [];
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].type === 'foreign') {
                referenced.push(this.attributes[i].referenceTable);
            }
        }
        return referenced;
    };
    $scope.newModel.__proto__.getNonForeignAttributes = function () {
        var attributes = [];
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].type === 'foreign') {
                continue;
            }
            attributes.push(this.attributes[i].name);
        }
        return attributes;
    };

    $scope.getAPIRoutes = function () {
        var routes = [];
        for (var i = 0; i < $scope.models.length; i++) {
            var firstRouteAdded = null;
            var dasherized = dasherizeFilter($scope.models[i].table);
            var camelized = camelizeFilter($scope.models[i].table);
            var variable = camelizeFilter($scope.models[i].name, true);
            if ($scope.models[i].define_route_all === true) {
                var length = routes.push('Route::get(\'/' + dasherized + '\', \'' + camelized + 'Controller@all\');');
                firstRouteAdded = firstRouteAdded === null ? length - 1 : firstRouteAdded;
            }
            if ($scope.models[i].per_page > 0) {
                var length = routes.push('Route::get(\'/' + dasherized + '\', \'' + camelized + 'Controller@paginate\');');
                firstRouteAdded = firstRouteAdded === null ? length - 1 : firstRouteAdded;
            }
            if ($scope.models[i].define_route_find === true) {
                var length = routes.push('Route::get(\'/' + dasherized + '/{' + variable + '}\', \'' + camelized + 'Controller@find\');');
                firstRouteAdded = firstRouteAdded === null ? length - 1 : firstRouteAdded;
            }
            if ($scope.models[i].define_route_create === true) {
                var length = routes.push('Route::post(\'/' + dasherized + '\', \'' + camelized + 'Controller@create\');');
                firstRouteAdded = firstRouteAdded === null ? length - 1 : firstRouteAdded;
            }
            if ($scope.models[i].define_route_update === true) {
                var length = routes.push('Route::patch(\'/' + dasherized + '/{' + variable + '}\', \'' + camelized + 'Controller@update\');');
                firstRouteAdded = firstRouteAdded === null ? length - 1 : firstRouteAdded;
            }
            if ($scope.models[i].define_route_delete === true) {
                var length = routes.push('Route::delete(\'/' + dasherized + '/{' + variable + '}\', \'' + camelized + 'Controller@delete\');');
                firstRouteAdded = firstRouteAdded === null ? length - 1 : firstRouteAdded;
            }
            if (firstRouteAdded !== null) {
                routes[firstRouteAdded] = $scope.models[i].h() + routes[firstRouteAdded];
                routes[routes.length - 1] += $scope.models[i].hE() + (i !== $scope.models.length - 1 ? '\n' : '');
            }
        }
        return routes.join('\n    ');
    };

    function makeAttributeTemplate(name, group, type, fakerFormatter, definition, preDefinition) {
        var templateTypes = {
            string: {
                type: 'string',
                is_fillable: true,
                is_hidden: false,
                is_nullable: true,
                is_unique: false,
                length: '',
            },
            integer: {
                type: 'integer',
                is_fillable: true,
                is_hidden: false,
                is_nullable: true,
                is_unique: false,
                is_unsigned: true,
            },
            constant: {
                type: 'constant',
                is_fillable: true,
                is_hidden: false,
                is_nullable: true,
                is_unique: false,
                is_unsigned: true,
            },
        };
        var attributeTemplate = {
            name: name,
            group: group,
            attributes: templateTypes[type],
        };
        if (angular.isDefined(fakerFormatter) === true && type === 'constant') {
            attributeTemplate.attributes.values = fakerFormatter;
        } else if (angular.isDefined(fakerFormatter) === true) {
            attributeTemplate.fakerFormatter = fakerFormatter;
        }
        if (angular.isDefined(definition) === true) {
            attributeTemplate.definition = definition;
        }
        if (angular.isDefined(preDefinition) === true) {
            attributeTemplate.preDefinition = preDefinition;
        }
        return attributeTemplate;
    }
    $scope.attributeTemplateOptions = [
        makeAttributeTemplate('name',            1, 'string', 'name'),
        makeAttributeTemplate('personal_title',  1, 'constant', ',mr,ms,mrs,miss'),
        makeAttributeTemplate('username',        1, 'string', 'name'),
        makeAttributeTemplate('first_name',      1, 'string', 'firstname'),
        makeAttributeTemplate('surname',         1, 'string', 'lastname'),
        makeAttributeTemplate('password',        1, 'string', undefined, '$[[variable]] ?: $[[variable]] = bcrypt(\'secret\')', 'static $[[variable]];'),
        makeAttributeTemplate('email',           2, 'string', 'safeEmail'),
        makeAttributeTemplate('phone',           2, 'string', 'phoneNumber'),
        makeAttributeTemplate('opt',             2, 'constant', ',in,out,out_legally'),
        makeAttributeTemplate('company',         3, 'string', 'company'),
        makeAttributeTemplate('address',         3, 'string', 'streetAddress'),
        makeAttributeTemplate('city',            3, 'string', 'city'),
        makeAttributeTemplate('postcode',        3, 'string', 'postcode'),
        makeAttributeTemplate('county',          3, 'string', 'state'),
        makeAttributeTemplate('country',         3, 'string', 'country'),
        makeAttributeTemplate('latitude',        3, 'string', 'latitude'),
        makeAttributeTemplate('longitude',       3, 'string', 'longitude'),
        makeAttributeTemplate('job_title',       3, 'string', 'jobTitle'),
        makeAttributeTemplate('status',          4, 'constant', 'suspect,prospect,active,dead'),
        makeAttributeTemplate('title',           4, 'string', 'sentence'),
        makeAttributeTemplate('title_short',     4, 'string', undefined, 'ucfirst($faker->unique()->words(rand(1, 3), true))'),
        makeAttributeTemplate('description',     4, 'string', 'realText'),
        makeAttributeTemplate('text',            4, 'text', 'realText'),
        makeAttributeTemplate('slug',            4, 'string', undefined, 'str_slug($faker->unique()->words(rand(1, 3), true))'),
        makeAttributeTemplate('quantity',        5, 'integer', undefined, 'mt_rand(1, 8)'),
        makeAttributeTemplate('price',           5, 'integer', undefined, 'mt_rand(1000, 10000)'),
        makeAttributeTemplate('discount_amount', 5, 'integer', undefined, 'mt_rand(10, 1000)'),
        makeAttributeTemplate('discount_type',   5, 'constant', 'none,percentage,absolute'),
        makeAttributeTemplate('payment_type',    5, 'constant', 'one-off,monthly,annually'),
        makeAttributeTemplate('website',         6, 'string', 'domainName'),
        makeAttributeTemplate('facebook',        6, 'string', undefined, 'camel_case($faker->unique()->company)'),
        makeAttributeTemplate('twitter',         6, 'string', undefined, 'camel_case($faker->unique()->company)'),
        makeAttributeTemplate('linkedin',        6, 'string', undefined, 'camel_case($faker->unique()->company)'),
        makeAttributeTemplate('ebay',            6, 'string', undefined, 'camel_case($faker->unique()->company)'),
        makeAttributeTemplate('amazon',          6, 'string', undefined, 'camel_case($faker->unique()->company)'),
        makeAttributeTemplate('skype',           6, 'string', undefined, 'camel_case($faker->unique()->company)'),
    ];

    if (typeof localStorage['elModels'] !== 'undefined') {
        $scope.models = JSON.parse(localStorage['elModels']);
    } else {
        $scope.resetClicked();
    }

    if (typeof localStorage['elSavedModels'] === 'undefined') {
        localStorage['elSavedModels'] = '[]';
    }
    $scope.elSavedModels = JSON.parse(localStorage['elSavedModels']);

    $scope.$watch('models', $scope.regeneratePreview, true);

    $scope.templates = {
        laravel: {
            migration: '',
            model: '',
            controller: '',
            database_seeder: '',
            model_factory: '',
            api: '',
            commands: '',
        },
        angular: {
            service: '',
            controller: '',
            html: '',
            main: '',
            elobject: '',
        },
    };
    angular.forEach($scope.templates.laravel, function (file, name) {
        $http.get('templates/laravel/' + camelizeFilter(name) + '.elt').then(function (response) {
            $scope.templates.laravel[name] = response.data;
        });
    });
    angular.forEach($scope.templates.angular, function (file, name) {
        $http.get('templates/angular/' + camelizeFilter(name) + '.elt').then(function (response) {
            $scope.templates.angular[name] = response.data;
            if (name === 'elobject') {
                $scope.templates.angular[name] = response.data.substr(1);
            }
        });
    });

    $scope.focusOnSelected = function (focusOnAttributeName) {
        if (typeof focusOnAttributeName === 'undefined') {
            focusOnAttributeName = false;
        }
        if ($scope.settings.selectedAttribute !== null) {
            document.querySelector('.model-container-' + $scope.settings.selectedModel + ' .attribute-container-' + $scope.settings.selectedAttribute + ' [ng-model="attribute.template"] input').focus();
        } else if ($scope.settings.selectedModel !== null) {
            document.querySelector('.model-container-' + $scope.settings.selectedModel + ' [ng-model="model.name"]').focus();
        }
    };

    $scope.keypressed = function ($event) {
        if (document.activeElement.tagName === 'BODY' && [13, 45, 61].indexOf($event.which) === -1) {
            if ($scope.settings.lastActiveElement !== null) {
                $scope.settings.lastActiveElement.focus();
                $scope.settings.lastActiveElement = null;
            } else {
                $scope.focusOnSelected(true);
            }
        }
    };

    hotkeys.bindTo($scope).add({
        combo: 'enter',
        description: 'Focus/Blur',
        allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
        callback: function () {
            var activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA') {
                $scope.settings.lastActiveElement = activeElement;
                activeElement.blur();
            } else if (activeElement.tagName === 'BODY') {
                if ($scope.settings.selectedModel === null) {
                    $scope.settings.selectedModel = 0;
                } else if ($scope.settings.lastActiveElement !== null) {
                    $scope.settings.lastActiveElement.focus();
                    $scope.settings.lastActiveElement = null;
                } else {
                    $scope.focusOnSelected();
                }
            }
        },
    }).add({
        combo: '=',
        description: 'New Model/Attribute',
        callback: function () {
            $scope.settings.lastActiveElement = null;
            if ($scope.settings.selectedAttribute !== null) {
                $scope.newAttributeClicked($scope.models[$scope.settings.selectedModel], $scope.settings.selectedAttribute);
            } else {
                $scope.newModelClicked($scope.settings.selectedModel !== null ? $scope.settings.selectedModel : $scope.models.length - 1);
            }
            setTimeout(function () {
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            }, 1);
        },
    }).add({
        combo: '-',
        description: 'Remove Model/Attribute',
        callback: function () {
            $scope.settings.lastActiveElement = null;
            if ($scope.settings.selectedAttribute !== null) {
                $scope.removeAttributeClicked($scope.settings.selectedModel, $scope.settings.selectedAttribute);
            } else if ($scope.settings.selectedModel !== null) {
                $scope.removeModelClicked($scope.settings.selectedModel);
            }
            setTimeout(function () {
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            }, 1);
        },
    }).add({
        combo: 'shift+down',
        description: 'Next Model/Attribute',
        allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
        callback: function () {
            document.activeElement.blur();
            $scope.settings.lastActiveElement = null;
            if ($scope.settings.selectedModel === null) {
                $scope.settings.selectedModel = 0;
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            } else if ($scope.settings.selectedAttribute !== null && $scope.settings.selectedAttribute + 1 < $scope.models[$scope.settings.selectedModel].attributes.length) {
                $scope.settings.selectedAttribute++;
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            } else if ($scope.settings.selectedAttribute === null && $scope.settings.selectedModel + 1 < $scope.models.length) {
                $scope.settings.selectedModel++;
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            } else {
                hotkeys.get('=').callback();
            }
            $scope.regeneratePreview();
        },
    }).add({
        combo: 'shift+up',
        description: 'Previous Model/Attribute',
        allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
        callback: function () {
            document.activeElement.blur();
            $scope.settings.lastActiveElement = null;
            if ($scope.settings.selectedAttribute !== null && $scope.settings.selectedAttribute - 1 >= 0) {
                $scope.settings.selectedAttribute--;
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            } else if ($scope.settings.selectedAttribute !== null && $scope.settings.selectedAttribute - 1 < 0) {
                $scope.settings.selectedAttribute = null;
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            } else if ($scope.settings.selectedAttribute === null && $scope.settings.selectedModel - 1 >= 0) {
                $scope.settings.selectedModel--;
                hotkeys.get('enter').callback();
                hotkeys.get('enter').callback();
            }
            $scope.regeneratePreview();
        },
    }).add({
        combo: 'shift+right',
        description: 'Focus on Attributes',
        allowIn: ['SELECT'],
        callback: function () {
            document.activeElement.blur();
            $scope.settings.lastActiveElement = null;
            if ($scope.settings.selectedModel === null) {
                $scope.settings.selectedModel = 0;
            } else if ($scope.settings.selectedAttribute === null) {
                $scope.settings.selectedAttribute = 0;
            }
            $scope.regeneratePreview();
        },
    }).add({
        combo: 'shift+left',
        description: 'Focus on Model',
        allowIn: ['SELECT'],
        callback: function () {
            document.activeElement.blur();
            $scope.settings.lastActiveElement = null;
            if ($scope.settings.selectedAttribute !== null) {
                $scope.settings.selectedAttribute = null;
            } else {
                $scope.settings.selectedModel = null;
            }
            $scope.regeneratePreview();
        },
    }).add({
        combo: 'command+c',
        description: 'Focus on Model',
        allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
        callback: function () {
            if ($scope.settings.selectedModel !== null) {
                $scope.copiedModel = angular.copy($scope.models[$scope.settings.selectedModel]);
            }
            if ($scope.settings.selectedAttribute !== null) {
                $scope.copiedAttribute = angular.copy($scope.models[$scope.settings.selectedModel].attributes[$scope.settings.selectedAttribute]);
            }
        },
    }).add({
        combo: 'command+v',
        description: 'Focus on Model',
        allowIn: ['INPUT', 'SELECT', 'TEXTAREA'],
        callback: function () {
            if ($scope.settings.selectedAttribute !== null) {
                $scope.models[$scope.settings.selectedModel].attributes[$scope.settings.selectedAttribute] = angular.copy($scope.copiedAttribute);
            } else if ($scope.settings.selectedModel !== null) {
                $scope.models[$scope.settings.selectedModel] = angular.copy($scope.copiedModel);
            }
        },
    });
});
