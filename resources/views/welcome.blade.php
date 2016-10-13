<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>EasyLaravel</title>
        <link rel="stylesheet" href="<% asset('assets/style.css') %>">
    </head>
    <body ng-app="app" ng-controller="welcome" ng-cloak ng-keypress="keypressed($event)">
        <div class="container-fluid">
            <h1>EasyLaravel</h1>

            <div class="row">
                <div class="col-md-6 form-inline" ng-form="form">
                    <div class="form-group">
                        <label>View:</label>
                        <label class="radio-inline">
                          <input type="radio" ng-model="settings.view" value="overview"> Overview
                        </label>
                        <label class="radio-inline">
                          <input type="radio" ng-model="settings.view" value="detailed"> Detailed
                        </label>
                    </div>
                    <div class="pull-right" uib-dropdown>
                        <button type="button" class="btn btn-primary btn-xs" uib-dropdown-toggle>
                            Load Model <span class="caret"></span>
                        </button>
                        <ul class="dropdown-menu" uib-dropdown-menu role="menu">
                            <li role="menuitem" ng-repeat="model in elSavedModels track by $index" ng-click="loadModelClicked(model)"><a href="#">{{ model.name }}</a></li>
                        </ul>
                    </div>

                    <div class="model-container model-container-{{ $index }}" ng-repeat="($modelIndex, model) in models" ng-click="modelClicked($index)" ng-class="{ 'highlighted-model' : settings.selectedModel === $index }">
                        <div class="form-group">
                            <input type="text" class="order-input" ng-model="model.order" placeholder="O" ng-blur="modelOrderBlurred(model); regeneratePreview()" ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                        </div>
                        <div class="form-group">
                            <input type="text" ng-model="model.name" placeholder="Model" ng-change="modelNameChanged($index); regeneratePreview()" ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                        </div>
                        <div class="form-group">
                            <input type="text" ng-model="model.table" ng-change="regeneratePreview()" placeholder="Table" name="modelTable" ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                        </div>
                        <button type="button" class="btn btn-success btn-xs" ng-model="model.is_pivot" uib-btn-checkbox ng-click="modelIsPivotClicked(model); settings.selectedModel = $index; $event.stopPropagation()">
                            P
                        </button>
                        <button type="button" class="btn btn-success btn-xs" ng-model="model.use_soft_deletes" uib-btn-checkbox ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                            SD
                        </button>
                        <button class="btn btn-primary btn-xs" type="button" ng-click="$event.stopPropagation(); newModelClicked($modelIndex)">+</button>
                        <button class="btn btn-primary btn-xs" type="button" ng-click="removeModelClicked($modelIndex)">x</button>
                        <div class="pull-right">
                            <button class="btn btn-warning btn-xs" type="button" ng-click="saveModelClicked(model)">Save</button>
                        </div>
                        <div class="pull-right" ng-show="settings.view === 'overview'">
                            <button type="button" class="btn btn-success btn-xs" ng-model="model.define_route_all" uib-btn-checkbox ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                                al
                            </button>
                            <div class="form-group">
                                <input class="number-input-sm" type="text" ng-model="model.per_page" placeholder="Per Page" ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                            </div>
                            <button type="button" class="btn btn-success btn-xs" ng-model="model.define_route_find" uib-btn-checkbox ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                                fi
                            </button>
                            <button type="button" class="btn btn-success btn-xs" ng-model="model.define_route_create" uib-btn-checkbox ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                                cr
                            </button>
                            <button type="button" class="btn btn-success btn-xs" ng-model="model.define_route_update" uib-btn-checkbox ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                                up
                            </button>
                            <button type="button" class="btn btn-success btn-xs" ng-model="model.define_route_delete" uib-btn-checkbox ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                                de
                            </button>
                            <div class="form-group">
                                <input class="number-input-sm" type="text" ng-model="model.amount" placeholder="Amount" ng-click="settings.selectedModel = $index; $event.stopPropagation()">
                            </div>
                        </div>
                        <div class="attribute-container attribute-container-{{ $index }}" ng-repeat="attribute in model.attributes track by $index" ng-show="settings.selectedModel === $modelIndex && settings.view !== 'overview'" ng-click="$event.stopPropagation(); attributeClicked($index)" ng-class="{ 'highlighted-attribute' : settings.selectedModel === $modelIndex && settings.selectedAttribute === $index }">
                            <div>
                                <div class="form-group">
                                    <input type="text" class="order-input" ng-model="attribute.order" placeholder="O" ng-blur="attributeOrderBlurred(model, attribute); regeneratePreview()" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                </div>
                                <div class="attribute-template-select pull-right">
                                    <oi-select oi-options="option.name group by option.group for option in attributeTemplateOptions" ng-model="attribute.template" ng-change="attributeTemplateChanged(attribute)" placeholder="Template"></oi-select>
                                </div>
                                <div class="form-group" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    <select ng-model="attribute.type" ng-change="regeneratePreview()">
                                        <option ng-repeat="option in attributeTypeOptions" value="{{ option }}">{{ option }}</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <input ng-hide="attribute.type === 'foreign'" type="text" ng-model="attribute.name" ng-change="regeneratePreview()" placeholder="Attribute" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    <select ng-show="attribute.type === 'foreign'" ng-model="attribute.referenceTable" ng-change="regeneratePreview()" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                        <option ng-repeat="model in models | limitTo:$modelIndex " value="{{ $index }}">{{ model.name | underscore }}_id</option>
                                    </select>
                                </div>
                                <button type="button" class="btn btn-success btn-xs" ng-model="attribute.is_fillable" uib-btn-checkbox ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    Fillable
                                </button>
                                <button type="button" class="btn btn-success btn-xs" ng-model="attribute.is_hidden" uib-btn-checkbox ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    Hidden
                                </button>
                                <button class="btn btn-default btn-xs" type="button" ng-click="$event.stopPropagation(); newAttributeClicked(model, $index)">+</button>
                                <button class="btn btn-default btn-xs" type="button" ng-click="removeAttributeClicked($modelIndex, $index)">x</button>
                            </div>
                            <div>
                                <button type="button" class="btn btn-success btn-xs" ng-model="attribute.is_nullable" uib-btn-checkbox ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    Nullable
                                </button>
                                <button type="button" class="btn btn-success btn-xs" ng-model="attribute.is_unique" uib-btn-checkbox ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    Unique
                                </button>
                                <button type="button" class="btn btn-success btn-xs" ng-model="attribute.has_default" uib-btn-checkbox ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                    Default
                                </button>
                                <div class="form-group">
                                    <input type="text" ng-model="attribute.default" placeholder="Default" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()" ng-disabled="attribute.has_default === false">
                                </div>
                                <button type="button" class="btn btn-success btn-xs" ng-model="attribute.is_unsigned" uib-btn-checkbox ng-click="settings.selectedAttribute = $index; $event.stopPropagation()" ng-show="canAttributeBeUnsigned(attribute)">
                                    Unsigned
                                </button>
                                <div class="form-group" ng-show="attribute.type === 'string'">
                                    <input class="number-input" type="text" ng-model="attribute.length" placeholder="$length = 255" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                </div>
                                <div class="form-group" ng-show="attribute.type === 'constant'">
                                    <input type="text" ng-model="attribute.values" placeholder="Values" ng-change="regeneratePreview()" ng-click="settings.selectedAttribute = $index; $event.stopPropagation()">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button class="btn btn-default" type="button" ng-click="downloadClicked()">Download</button>
                        <button class="btn btn-default" type="button" ng-click="saveClicked()">Save</button>
                        <button class="btn btn-default" type="button" ng-click="loadClicked()">Load</button>
                        <button class="btn btn-default" type="button" ng-click="resetClicked()">Reset</button>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="form-group">
                        <label>Code View:</label>
                        <label class="radio-inline" ng-repeat="(name,file) in templates.laravel">
                            <input type="radio" ng-model="settings.codeView" ng-click="regeneratePreview()" ng-value="'laravel_' + name"> {{ name | camelize }}
                        </label>
                        <label class="radio-inline" ng-repeat="(name,file) in templates.angular">
                            <input type="radio" ng-model="settings.codeView" ng-click="regeneratePreview()" ng-value="'angular_' + name"> {{ name | camelize }}
                        </label>
                    </div>
                    <pre ng-bind-html="previewCode" ng-click="executeCopy(previewCode)"></div>
            </div>
        </div>

        <script src="<% asset('assets/lib.js') %>"></script>
        <script src="<% asset('assets/app.js') %>"></script>
    </body>
</html>
