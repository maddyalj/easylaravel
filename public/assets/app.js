'use strict';

var app = angular.module('app', ['oi.select', 'ngInflection', 'cfp.hotkeys', 'ui.bootstrap']);

app.controller('welcome', function (
    $scope, $http, $sce, orderByFilter, uppercaseFilter, lowercaseFilter, camelizeFilter, underscoreFilter, pluralizeFilter, titleizeFilter, hotkeys
) {
    function getLongestStringLength(array) {
        var length = 0;
        for (var i = 0; i < array.length; i++) {
            if (array[i].length > length) {
                length = array[i].length;
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
                  var longest = getLongestStringLength(values);
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
              return uppercaseFilter(value) + ': '
                  + getSpaces(longest, value) + (count + 1)
                  + (isLast === true ? '' : ',') + '\n';
          });
      };

      $scope.getAngularLabels = function () {
          return loopThroughConstants(function (value, isLast, count, longest) {
              return (count + 1) + ': '
                  + '\'' + titleizeFilter(value) + '\''
                  + (isLast === true ? '' : ',') + '\n';
          });
      };

     $scope.executeCopy = function (text) {
         text = unescapeHtml(text.toString().replace(/<span.*?>/g, ''));
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

    $scope.saveClicked = function () {
        localStorage['elModels'] = JSON.stringify($scope.models);
    };

    $scope.exportClicked = function () {
        var url = 'data:text/json;charset=utf8,' + encodeURIComponent(JSON.stringify($scope.models));
        window.open(url, '_blank');
        window.focus();
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
        if (lowercaseFilter(attribute.default) === 'null') {
            return lowercaseFilter(attribute.default);
        } else if (attribute.type === 'string' || attribute.type === 'text') {
            return '\'' + attribute.default + '\'';
        } else if (attribute.type === 'boolean') {
            return lowercaseFilter(attribute.default);
        }
        return attribute.default;
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
        } else {
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
                default:
            }
        }
        if (fakerFormatter !== '') {
            definition = '$faker->' + ifTrue(this.is_nullable, 'optional()->') + ifTrue(this.is_unique, 'unique()->') + fakerFormatter;
        }
        return definition;
    };
    $scope.newModelAttribute.__proto__.getSpaces = function (model) {
        return Array(model.getLongestLength() - this.name.length + 1).join(' ');
    };

    $scope.newModel = {
        order: 10,
        name: '',
        table: '',
        use_soft_deletes: true,
        amount: 100,
        perPage: null,
        attributes: [angular.copy($scope.newModelAttribute)],
        lastUpdated: null,
        longestLength: null,
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
    $scope.newModel.__proto__.updateLongestLength = function () {
        this.longestLength = getLongestStringLength($scope.getAttributeNames(this.attributes));
    };
    $scope.newModel.__proto__.getLongestLength = function () {
        return this.longestLength;
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
            var longest = getLongestStringLength(values);
            angular.forEach(values, function (value, i) {
                output += '        \'' + uppercaseFilter(value) + '\' ' + getSpaces(longest, value) + '=> ' + (i + 1) + ',\n';
            });
            output += '    ];\n';
            if (attribute.isAttributeSelected() === true) {
                output += '[/HIGHLIGHT]';
            }
        });
        return output;
    };
    $scope.newModel.__proto__.hasHidden = function () {
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
        console.dir(hidden);
        return hidden.join('\', \'');
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
    }

    var attributeTemplateString = {
        type: 'string',
        is_fillable: true,
        is_hidden: false,
        is_nullable: true,
        is_unique: false,
        length: '',
    };
    var attributeTemplateInteger = {
        type: 'integer',
        is_fillable: true,
        is_hidden: false,
        is_nullable: true,
        is_unique: false,
        is_unsigned: true,
    };
    var attributeTemplateConstant = {
        type: 'constant',
        is_fillable: true,
        is_hidden: false,
        is_nullable: true,
        is_unique: false,
        is_unsigned: true,
    };
    $scope.attributeTemplateOptions = [{
        name: 'name',
        group: 'Person',
        attributes: attributeTemplateString,
        fakerFormatter: 'name',
    }, {
        name: 'first_name',
        group: 'Person',
        attributes: attributeTemplateString,
        fakerFormatter: 'name',
    }, {
        name: 'surname',
        group: 'Person',
        attributes: attributeTemplateString,
        fakerFormatter: 'name',
    }, {
        name: 'email',
        group: 'Person',
        attributes: attributeTemplateString,
        fakerFormatter: 'safeEmail',
    }, {
        name: 'password',
        group: 'Person',
        attributes: attributeTemplateString,
        preDefinition: 'static $[[variable]];',
        definition: '$[[variable]] ?: $[[variable]] = bcrypt(\'secret\')',
    }, {
        name: 'remember_token',
        group: 'Person',
        attributes: attributeTemplateString,
        definition: 'str_random(10)',
    }, {
        name: 'phone',
        group: 'Contact',
        attributes: attributeTemplateString,
    }, {
        name: 'quantity',
        group: 'Numbers',
        attributes: attributeTemplateInteger,
    }, {
        name: 'price',
        group: 'Numbers',
        attributes: attributeTemplateInteger,
    }, {
        name: 'discount_amount',
        group: 'Numbers',
        attributes: attributeTemplateInteger,
    }, {
        name: 'discount_type',
        group: 'Numbers',
        attributes: attributeTemplateConstant,
    }];

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
        },
        angular: {
            service: '',
            controller: '',
            main: '',
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
            } else if ($scope.settings.selectedAttribute !== null && $scope.settings.selectedAttribute + 1 < $scope.models[$scope.settings.selectedModel].attributes.length) {
                $scope.settings.selectedAttribute++;
            } else if ($scope.settings.selectedAttribute === null && $scope.settings.selectedModel + 1 < $scope.models.length) {
                $scope.settings.selectedModel++;
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
            } else if ($scope.settings.selectedAttribute !== null && $scope.settings.selectedAttribute - 1 < 0) {
                $scope.settings.selectedAttribute = null;
            } else if ($scope.settings.selectedAttribute === null && $scope.settings.selectedModel - 1 >= 0) {
                $scope.settings.selectedModel--;
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
