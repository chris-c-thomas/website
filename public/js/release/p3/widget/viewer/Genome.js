define("p3/widget/viewer/Genome", [
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "../InteractionsContainer", "../Phylogeny", "../GenomeBrowser",
	"../SequenceGridContainer", "../../util/PathJoin"
], function(declare, TabViewerBase, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, InteractionsContainer, Phylogeny, GenomeBrowser,
			SequenceGridContainer, PathJoin){
	return declare([TabViewerBase], {
		"baseClass": "GenomeGroup",
		"disabled": false,
		"query": null,
		containerType: "genome_group",
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,
		perspectiveLabel: "Genome View",
		perspectiveIconClass: "icon-selection-Genome",

		_setGenome_idAttr: function(id){
			// console.log("_setGenome_IDAttr: ", id, this.genome_id);
			if(!id){
				return;
			}

			if(this.genome_id == id){
				// console.log("Genome ID Already Set");
				return;
			}

			this.genome_id = this.state.genome_id = id;
			this.state.genome_ids = [id];

			xhr.get(PathJoin(this.apiServiceUrl, "genome", id), {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(genome){
				this.set("genome", genome)
			}));

		},

		setActivePanelState: function(){
			var activeQueryState;
			// console.log("Set ActivePanelState: ", JSON.stringify(this.state,null,4));
			if(this.state.genome_id){
				activeQueryState = lang.mixin({}, this.state, {search: "eq(genome_id," + this.state.genome_id + ")"});
			}
			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			var activeTab = this[active];
			// console.log("Active Panel: ", active);

			switch(active){
				case "phylogeny":
				case "overview":
					if(this.state.genome){
						activeTab.set("state", lang.mixin({}, this.state));
					}
					break;
				case "transcriptomics":
					activeTab.set("state", lang.mixin({}, this.state, {search: "eq(genome_ids," + this.genome_id + ")"}));
					break;
				case "proteinFamilies":
					// do not set state, the container is built by setVisible already
					break;
				default:
					if(activeQueryState){
						// console.log("Using Default ActiveQueryState: ", activeQueryState);
						activeTab.set("state", activeQueryState);
					}else{
						console.log("Missing Active Query State for: ", active)
					}
					break;
			}

			if(this.genome){
				var pageTitle = this.genome.genome_name + "::Genome " + activeTab.title;
				// console.log("Genome setActivePanelState: ", pageTitle);
				if(window.document.title !== pageTitle){
					window.document.title = pageTitle;
				}
			}
		},

		buildHeaderContent: function(genome){

			xhr.get(PathJoin(this.apiServiceUrl, "taxonomy", genome.taxon_id), {
				headers: {
					accept: "application/json"
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(taxon){
				var taxon_lineage_names = taxon.lineage_names;
				var taxon_lineage_ids = taxon.lineage_ids;
				var taxon_lineage_ranks = taxon.lineage_ranks;

				var visibleRanks = ["superkingdom", "phylum", "class", "order", "family", "genus", "species"];
				var visibleIndexes = taxon_lineage_ranks.filter(function(rank){
					return visibleRanks.indexOf(rank) > -1;
				}).map(function(rank){
					return taxon_lineage_ranks.indexOf(rank);
				});

				var out = visibleIndexes.map(function(idx){
					return '<a class="navigationLink" href="/view/Taxonomy/' + taxon_lineage_ids[idx] + '">' + taxon_lineage_names[idx] + '</a>';
				});
				this.queryNode.innerHTML = out.join(" &raquo; ") + " &raquo; " + '<span class="current">' + genome.genome_name + '</span>';
			}));
		},

		_setGenomeAttr: function(genome){
			this.state.genome = genome;

			this.buildHeaderContent(genome);
			domConstruct.empty(this.totalCountNode);

			this._set("genome", genome);
			this.setActivePanelState();
			this.resize();
		},

		createOverviewPanel: function(){
			return new GenomeOverview({
				title: "Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		onSetState: function(attr, oldState, state){

			var parts = state.pathname.split("/");
			this.set("genome_id", parts[parts.length - 1]);
			state.genome_id = parts[parts.length - 1];
			state.genome_ids = [state.genome_id];
			if(!state){
				return;
			}

			// console.log("Genome: ", state.genome, state.genome_id)

			if(state && state.genome_id && !state.genome){
				// console.log("No state.genome.  state.genome_id: ", state.genome_id);
				if(oldState && oldState.genome_id){
					// console.log("oldState.genome_id: ", oldState.genome_id)

					if((state.genome_id == oldState.genome_id)){
						if(oldState.genome || this.genome){
							// console.log("oldState Genome: ", oldState.genome || this.genome);
							state.genome = oldState.genome || this.genome;
						}else{
							console.log("oldState missing Genome");
						}
					}
				}
			}

			if(state.hashParams && state.hashParams.view_tab){

				if(this[state.hashParams.view_tab]){
					var vt = this[state.hashParams.view_tab];

					if(state.hashParams.view_tab === "proteinFamilies"){
						// state.hashParams = lang.mixin({}, state.hashParams, {
						// 	params: JSON.stringify({"family_type": "plfam"})
						// });

						this.proteinFamilies.state = lang.mixin({}, state, {
							hashParams: lang.mixin({}, state.hashParams, {
								params: encodeURIComponent(JSON.stringify({"family_type": "plfam"}))
							})
						});
					}

					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}else{
					// console.log("No view-tab supplied in State Object");
				}
			}

			this.setActivePanelState();

			// console.log("viewer/Genome onSetState() after set genome_id")
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.overview = this.createOverviewPanel();
			this.phylogeny = new Phylogeny({
				title: "Phylogeny",
				id: this.viewer.id + "_" + "phylogeny"
			});

			this.sequences = new SequenceGridContainer({
				title: "Sequences",
				id: this.viewer.id + "_" + "sequences",
				state: lang.mixin({}, this.state, {search: "?eq(genome_id," + this.genome_id + ")"})
			});

			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_" + "features",
				state: lang.mixin({}, this.state, {search: "?eq(genome_id," + this.genome_id + ")"})
			});

			this.browser = new GenomeBrowser({
				title: "Genome Browser",
				id: this.viewer.id + "_" + "browser",
				state: lang.mixin({}, this.state),
				tooltip: 'The "Browser" tab shows genome sequence and genomic features using linear genome browser'
			});

			this.circular = new CircularViewerContainer({
				title: "Circular Viewer",
				id: this.viewer.id + "_" + "circular",
				state: lang.mixin({}, this.state)
			});

			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_" + "specialtyGenes",
				state: lang.mixin({}, this.state, {search: "?eq(genome_id," + this.genome_id + ")"})
			});
			this.pathways = new PathwaysContainer({
				apiServer: this.apiServiceUrl,
				title: "Pathways",
				id: this.viewer.id + "_" + "pathways",
				state: this.state
			});
			this.proteinFamilies = new ProteinFamiliesContainer({
				title: "Protein Families",
				id: this.viewer.id + "_" + "proteinFamilies",
				state: this.state
			});
			this.transcriptomics = new TranscriptomicsContainer({
				title: "Transcriptomics",
				id: this.viewer.id + "_" + "transcriptomics",
				state: this.state
			});
			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.phylogeny);
			this.viewer.addChild(this.browser);
			this.viewer.addChild(this.circular);
			this.viewer.addChild(this.sequences);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.transcriptomics);
		}
	});
});
