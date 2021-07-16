define([
  'dojo/_base/declare', './GridContainer', 'dojo/on',
  './SerologyGrid', './AdvancedSearchFields', 'dijit/popup', 'dojo/topic',
  'dijit/TooltipDialog', './FacetFilterPanel',
  'dojo/_base/lang', 'dojo/dom-construct'

], function (
  declare, GridContainer, on,
  SerologyGrid, AdvancedSearchFields, popup, Topic,
  TooltipDialog, FacetFilterPanel,
  lang, domConstruct
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: SerologyGrid,
    containerType: 'serology_data',
    tutorialLink: '',
    // facetFields: ['host_type', 'host_species', 'host_common_name', 'collection_country', 'collection_year', 'test_type', 'test_result', 'serotype'],
    facetFields: AdvancedSearchFields['serology'].filter((ff) => ff.facet),
    filter: '',
    maxGenomeCount: 10000,
    dataModel: 'serology',
    primaryKey: 'id',
    maxDownloadSize: 25000,
    defaultFilter: '',
    tooltip: '',
    getFilterPanel: function (opts) {

    },
    containerActions: GridContainer.prototype.containerActions.concat([
      [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {
          var _self = this;

          var totalRows = _self.grid.totalRows;
          // console.log("TOTAL ROWS: ", totalRows);
          if (totalRows > _self.maxDownloadSize) {
            downloadTT.set('content', 'This table exceeds the maximum download size of ' + _self.maxDownloadSize);
          } else {
            downloadTT.set('content', dfc);

            on(downloadTT.domNode, 'div:click', function (evt) {
              var rel = evt.target.attributes.rel.value;
              var dataType = _self.dataModel;
              var currentQuery = _self.grid.get('query');

              // console.log("DownloadQuery: ", currentQuery);
              var query = currentQuery + '&sort(+' + _self.primaryKey + ')&limit(' + _self.maxDownloadSize + ')';

              var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : '');
              if (baseUrl.charAt(-1) !== '/') {
                baseUrl += '/';
              }
              baseUrl = baseUrl + dataType + '/?';

              if (window.App.authorizationToken) {
                baseUrl = baseUrl + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken);
              }

              baseUrl = baseUrl + '&http_accept=' + rel + '&http_download=true';
              var form = domConstruct.create('form', {
                style: 'display: none;',
                id: 'downloadForm',
                enctype: 'application/x-www-form-urlencoded',
                name: 'downloadForm',
                method: 'post',
                action: baseUrl
              }, _self.domNode);
              domConstruct.create('input', {
                type: 'hidden',
                value: encodeURIComponent(query),
                name: 'rql'
              }, form);
              form.submit();

              popup.close(downloadTT);
            });
          }

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true,
        'left'
      ]
    ])
  });
});