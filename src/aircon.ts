// class to provide a Device accessory helper
// import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, HAP, HAPStatus, Logger, PlatformAccessory, Service } from "homebridge";
import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, HAP, HAPStatus, Logger, PlatformAccessory, Service } from "homebridge";
import { EchonetLite, Device } from 'node-echonet-lite';
import { AnekolEchonetLite } from "./index"

const ECHONET_OPERATION_STATUS = 0x80

export class AnekolAirconHandler {
	private hap: HAP
	private log: Logger
	private state_change_started = 0



	// constructor
	constructor(
		private readonly platform: AnekolEchonetLite,
		private readonly accessory: PlatformAccessory,
		private readonly el: typeof EchonetLite,
		private readonly device: typeof Device,
		private readonly verboseLog: boolean
	) {
		this.hap = this.platform.api.hap
		this.log = this.platform.log

		// configure the information service
		accessory.getService(this.hap.Service.AccessoryInformation) ||
			accessory.addService(this.hap.Service.AccessoryInformation)
				.setCharacteristic(this.hap.Characteristic.Manufacturer, 'Anekol')
				.setCharacteristic(this.hap.Characteristic.Model, 'AirConditioner')


		// configure the heater_cooler service
		const service = (accessory.getService(this.hap.Service.HeaterCooler) ||
			accessory.addService(this.hap.Service.HeaterCooler))
			.setCharacteristic(this.hap.Characteristic.Active, this.hap.Characteristic.Active.INACTIVE)

		// configure event handlers
		service.getCharacteristic(this.hap.Characteristic.Active)
			.on('get', this.getActive.bind(this, this.el, this.device))
			.on('set', this.setActive.bind(this, this.el, this.device))


		this.platform.api.updatePlatformAccessories([accessory])
	}
	// get active
	private async getActive(el: typeof EchonetLite, device: typeof Device, callback: CharacteristicGetCallback) {
		const address = device['address'];
		const edt = ECHONET_OPERATION_STATUS
		const eoj = device['eoj'][0];
		this.el.getPropertyValue(address, eoj, edt, (err: Error, res: Response) => {
			if (err)
				callback(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
			const active = res['message']['data']['status'];
			if (this.verboseLog)
				this.log.info('Get Active: ' + (active ? 'on' : 'off'));
			callback(HAPStatus.SUCCESS, active);
		});

	}

	// set active
	private async setActive(el: typeof EchonetLite, device: typeof Device, target_active: CharacteristicValue, callback: CharacteristicSetCallback) {

		const address = device['address']
		const edt = ECHONET_OPERATION_STATUS
		const eoj = device['eoj'][0];
		this.el.setPropertyValue(address, eoj, edt, { status: target_active != 0 }, (err: Error, _: Response) => {
			if (err)
				callback(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
			if (this.verboseLog)
				this.log.info('Set Active: ' + (target_active ? 'on' : 'off'));
			callback(HAPStatus.SUCCESS);
		});

	}
}