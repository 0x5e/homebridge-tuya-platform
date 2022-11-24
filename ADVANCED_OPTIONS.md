# Advanced Device Options

- `options.devices` - **optional**: An array of device config objects used for overriding properties.
- `options.devices[].id` - **required**: Device ID or Product ID.
- `options.devices[].accessoryCategory` - **optional**: Accessory Category ID. Overriding this property can change accessory's icon. See: [Homebridge Plugin Documentation > Categories](https://developers.homebridge.io/#/categories)
- `options.devices[].category` - **optional**: Device category code. See [SUPPORTED_DEVICES.md](./SUPPORTED_DEVICES.md). Also you can use `hidden` to hide device or product. **⚠️Overriding this property may leads to unexpected behaviors and exceptions. Please remove accessory cache after change it.**

- `options.devices[].schemaTransform` - **optional**: Schema transform map. When your device have non-standard schemas, this is used for transform them.
- `options.devices[].schemaTransform[code].code` - **optional**: New schema code.
- `options.devices[].schemaTransform[code].type` - **optional**: New schema type. One of the `Boolean`, `Integer`, `Enum`, `Json`, `Raw`.
- `options.devices[].schemaTransform[code].property` - **optional**: New schema property object. For `Integer` type, the object should contains `min`, `max`, `scale`, `step`; For `Enum` type, the object should contains `range`. For detail information, please see `TuyaDeviceSchemaProperty` in [TuyaDevice.ts](./src/device/TuyaDevice.ts).
- `options.devices[].schemaTransform[code].onGet` - **optional**: A Javascript function to transform old value to new value. The function is called with one argument: `value`.
- `options.devices[].schemaTransform[code].onSet` - **optional**: A Javascript function to transform new value to old value. The function is called with one argument: `value`.

## Examples

### Hide device

```js
{
  "options": {
    // ...
    "devices": [{
      "id": "{device_id}",
      "category": "hidden"
    }]
  }
}
```

### Changing schema code

```js
{
  "options": {
    // ...
    "devices": [{
      "id": "{device_id}",
      "schemaTransform": {
        "{oldCode}": {
          "code": "{newCode}",
        }
      }
    }]
  }
}
```

### Convert from enum schema to boolean schema

If you want to convert a enum schema as a switch, you can do it like this:

```js
{
  "options": {
    // ...
    "devices": [{
      "id": "{device_id}",
      "schemaTransform": {
        "{oldCode}": {
          "type": "Boolean",
          "onGet": "return (value === 'open') ? true : false;",
          "onSet": "return (value === true) ? 'open' : 'close';",
        }
      }
    }]
  }
}
```

### Adjust integer schema ranges

Some odd thermostat stores double of the real value to keep the decimal part (0.5°C).

For example: `40` means `20.0°C`, `41` means `20.5°C`. (storeValue = realValue x 2)

But actually, schema already support storing decimal value by setting the `scale` to `1`. The `min`, `max`, `step`, `value` should always be divided by `10^scale`. When `scale = 1`, means they should be divided by `10`.

After transform the value using `onGet` and `onSet`, the `property` should be changed to fit the new ranges.

```js
{
  "options": {
    // ...
    "devices": [{
      "id": "{device_id}",
      "schemaTransform": {
        "{oldCode}": {
          "onGet": "return (value * 5);",
          "onSet": "return (value / 5);",
          "property": {
            "min": 200,
            "max": 500,
            "scale": 1,
            "step": 5,
          },
        }
      }
    }]
  }
}
```

Or if you are not familiar with `scale`, just simply ignore the decimal part is also okay.

```js
{
  "options": {
    // ...
    "devices": [{
      "id": "{device_id}",
      "schemaTransform": {
        "{oldCode}": {
          "onGet": "return Math.round(value / 2);",
          "onSet": "return (value * 2);",
          "property": {
            "min": 20,
            "max": 50,
            "scale": 0,
            "step": 1,
          },
        }
      }
    }]
  }
}
```
