// class to provide an Echonet Lite platform
import { API, DynamicPlatformPlugin, HAP, Logger, PlatformAccessory, PlatformConfig } from "homebridge";
import { Device, Error, Response } from 'node-echonet-lite';
import { AnekolAirconHandler } from './aircon';
import EchonetLite = require('node-echonet-lite');

module.exports = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, AnekolEchonetLite);
}

const PLATFORM_NAME = 'AnekolEchonetLite';
const PLUGIN_NAME = 'homebridge-anekol-echonet-lite'; // Plugin name from package.json

const ECHONET_GROUP_AIRCON = 0x01
const ECHONET_CLASS_AIRCON = 0x30

export class AnekolEchonetLite implements DynamicPlatformPlugin {
  private configured: PlatformAccessory[] = []
  public el: typeof EchonetLite
  private hap: HAP
  private restored: PlatformAccessory[] = []
  private verboseLog = false

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.hap = api.hap

    // user config
    this.verboseLog = config.verboseLog as boolean || true

    // wait for "didFinishLaunching" 
    api.on('didFinishLaunching', () => {
      this.log.info("Finished restoring cached accessories")

      this.el = new EchonetLite({ 'type': 'lan' });
      this.el.init((err: string) => {
        if (err) {
          this.log.error(err);
        } else {
          // configure the device and it's accessories
          // Start to discover Echonet Lite devices
          this.el.startDiscovery((err: Error, res: Response) => {
            if (err) {
              this.logErrorAndExit(err);
            }
            // Determine the type of the found device
            const device = res['device'];
            const address = device['address'];
            const eoj = device['eoj'][0];
            const group_code = eoj[0];
            const class_code = eoj[1];

            switch (group_code) {
              case ECHONET_GROUP_AIRCON: {
                switch (class_code) {
                  case ECHONET_CLASS_AIRCON: {
                    // This means that the found device belongs to the home air conditioner class
                    this.log.info('Found AirConditioner: ' + address);
                    this.config_aircon(device, address)
                    break;
                  }
                  default: {
                    break;
                  }
                }
                break;
              }
              default: {
                break;
              }
            }
          });

          setTimeout(() => {
            this.el.stopDiscovery();
            for (const c of this.configured) {
              if (this.verboseLog)
                this.log.info("Configured: " + c.displayName)
            }
          }, 60 * 1000);
        }
      });
    })
  }


  // configure an aircon
  public config_aircon(device: typeof Device, address: string) {

    // configure the main device accessory
    const uuid = this.hap.uuid.generate(PLUGIN_NAME + "_device_" + address)
    let accessory = this.find_restored(uuid)
    if (!accessory) {
      // accessory = new this.api.platformAccessory(address, uuid, this.hap.Categories.AIR_CONDITIONER);
      accessory = new this.api.platformAccessory(address, uuid);
      this.log.info('Added new accessory: ' + accessory.displayName);
    } else {
      if (this.verboseLog)
        this.log.info('Restored: ' + accessory.displayName);
    }
    new AnekolAirconHandler(this, accessory, this.el, device, this.verboseLog)
    this.add_configured(accessory)
  }

  // log error and exit
  private logErrorAndExit(err: Error) {
    this.log.info("Discovery Error: " + err.toString());
    process.exit();
  }

  // add accessory to configured list
  public add_configured(accessory: PlatformAccessory) {
    this.configured.push(accessory)
  }

  // configureAccessory will be called once for every cached accessory restored
  public configureAccessory(accessory: PlatformAccessory) {
    this.log.info("Restored: " + accessory.displayName)
    this.restored.push(accessory)
  }

  // find restored accessory
  public find_restored(uuid: string) {
    return this.restored.find(a => a.UUID === uuid)
  }


}
