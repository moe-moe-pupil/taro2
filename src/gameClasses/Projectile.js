var Projectile = IgeEntityPhysics.extend({
	classId: 'Projectile',

	init: function (data, entityIdFromServer) {
		IgeEntityPhysics.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer);
		var self = this;
		self.category('projectile');

		var projectileData = {};
		if (ige.isClient) {
			projectileData = ige.game.getAsset('projectileTypes', data.type);
		}

		self.entityId = this._id;

		self._stats = {...projectileData, ...data};
		
		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		// set projectile state to default
		if (!self._stats.stateId) {
			for (var stateKey in self._stats.states) {
				var state = self._stats.states[stateKey];
				if (state && state.name === 'default') {
					self._stats.stateId = stateKey;
					break;
				}
			}
		}

		if (ige.isServer) {
			self.mount(ige.$('baseScene'));
		}

		if (ige.isClient) {
			ige.client.emit('create-projectile', this);
		}

		if (self._stats.states) {
			var currentState = self._stats.states[self._stats.stateId];
			if (currentState) {
				var body = self._stats.bodies && self._stats.bodies[currentState.body] || { type: 'none' };
				if (body) {
					self._stats.currentBody = body;
					self.width(self._stats.currentBody.width);
					self.height(self._stats.currentBody.height);
				} else {
					// console.log('No body found for projectile', this._stats.name)
					return;
				}
			}
		}

		self.addComponent(AttributeComponent); // every projectile gets one
		
		self.addComponent(ScriptComponent); // entity-scripting		
		self.script.load(data.scripts)

		// convert number variables into Int
		self.parseEntityObject(self._stats);

		// console.log(self._stats.lifeSpan)
		if (self._stats.lifeSpan != undefined) {
			this.lifeSpan(self._stats.lifeSpan);
		}

		this.updateBody(data.defaultData);
		
		var sourceItem = this.getSourceItem();

		if (ige.isServer) {

			// stream projectile data if
			if (!ige.network.isPaused && (
					!ige.game.data.defaultData.clientPhysicsEngine || // client side isn't running physics (csp requires physics) OR
					!sourceItem || // projectile does not have source item (created via script) OR
					(sourceItem && sourceItem._stats.projectileStreamMode == 1) // item is set to stream its projectiles from server
				)
			) {
				this.streamMode(1);
			} else {
				this.streamMode(0);
			}
			ige.server.totalProjectilesCreated++;
		} else if (ige.isClient) {
			if (currentState) {
				var defaultAnimation = this._stats.animations[currentState.animation];
				this.addToRenderer(defaultAnimation && defaultAnimation.frames[0] - 1, data.defaultData);
			}
			self.drawBounds(false);

			self.updateLayer();
			self.updateTexture();
			//mouseEvents for sandbox mode only
			self.mouseEvents();

		}
		this.playEffect('create');

		// add behaviour also have isClient block so we will have to execute this in both client and server
		this.addBehaviour('projectileBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);
	},

	_behaviour: function (ctx) {
		var self = this;
		_.forEach(ige.triggersQueued, function (trigger) {
			trigger.params['thisEntityId'] = self.id();
			self.script.trigger(trigger.name, trigger.params);
		});

		// if entity (unit/item/player/projectile) has attribute, run regenerate
		if (ige.isServer) {
			if (this.attribute) {
				this.attribute.regenerate();
			}
		}

		if (ige.physics && ige.physics.engine != 'CRASH') {
			this.processBox2dQueue();
		}
	},

	streamUpdateData: function (queuedData) {

		if (ige.isServer && ige.network.isPaused) 
			return;
			
		IgeEntity.prototype.streamUpdateData.call(this, data);
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {

					case 'scaleBody':
						if (ige.isServer) {
							// finding all attach entities before changing body dimensions
							if (this.jointsAttached) {
								var attachedEntities = {};
								for (var entityId in this.jointsAttached) {
									if (entityId != this.id()) {
										attachedEntities[entityId] = true;
									}
								}
							}

							this._scaleBox2dBody(newValue);
						} else if (ige.isClient) {
							this._stats.scale = newValue;
							this._scaleTexture();
						}
						break;
				}
			}
		}
	},

	tick: function (ctx) {
		IgeEntity.prototype.tick.call(this, ctx);
	},

	setSourceUnit: function (unit) {
		if (unit) {
			this._stats.sourceUnitId = unit.id();
			this.streamUpdateData([{sourceUnitId: unit.id()}]) // stream update to the clients			
		}
	},

	getSourceItem: function () {
		var self = this;

		return self._stats && self._stats.sourceItemId && ige.$(self._stats.sourceItemId);
	},

	destroy: function () {
		this.playEffect('destroy');
		IgeEntityPhysics.prototype.destroy.call(this);
		if (ige.physics && ige.physics.engine == 'CRASH') {
			this.destroyBody();
		}
	}, 

	// update this projectile's stats in the client side
	streamUpdateData: function (queuedData) {
		var self = this;
		IgeEntity.prototype.streamUpdateData.call(this, queuedData);
		
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {
				var newValue = data[attrName];

				switch (attrName) {
					case 'sourceUnitId':
						this._stats.sourceUnitId = newValue;
						break;
				}
			}
		}
	}

});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
	module.exports = Projectile;
}
