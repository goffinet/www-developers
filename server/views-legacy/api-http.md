# littleBits Cloud HTTP API Documentation

## Getting Started

A great to start is the [API lessons](https://github.com/littlebits/cloud-api-lessons) we’ve put together. They lay out how to get up and running in a step-by-step way, using just `curl` in your terminal.


## Authorization

Authorization is a standard OAuth 2 system.

Every request ***must*** contain an `Authorization` http header bearing an auth token.

Example:

    curl -i -XGET -H "Authorization: Bearer foobar" ...

* [Find out how to get your access token here.](/access)
* [Auth resources](#resources)


## Version

Available versions are:

- master [default]
- v2
- v1

Every request *should* specify an `Accept` header that pins the api version. Version `master` is bleeding edge, changes regularly, and makes no guarantees (performance, backwards compatibility, stability, documentation, etc.). Beware, if you omit `version` it defaults to `master`.

**The docs here are for v2**

Example:

    curl -i -XGET -H "Accept: application/vnd.littlebits.v2+json" ...

For quick experimentation purposes only the `version` can be specified at the URI root too:

Example:

    curl -i XGET ... api-http.littlebitscloud.cc/devices



## Endpoints Overview
                                    ---Responds---
                                  OAuth   HTTP
    path                          Scope   Code  Payload ◆       Make LB Cloud...
    ----                          -----   ----  ---------       ----------------
    /devices
      GET                         read    200   [<devices>]    return a list of the user’s devices

        /{device_id}
          GET                     read    200   <device>       return device model
          PUT                     admin   200   <device>       update device model
          POST                    admin   201   <device>       activate device, is then associated to the user
          DELETE                  admin   200   <device>       deactivate device, is then associated to no body

              /output
                POST              write   200                  output some voltage on the given device

    /subscriptions
      GET                         read    200   [<subs>]       return device's subscriptions
      POST                        read    201                  publish given device events to given endpoint
      DELETE                      read    200                  stop publishing given device events to a given endpoint

* [Object Schemas](#object-schemas)


## Endpoints Overview

## /devices/{device_id}

### GET

```
curl -i -XGET -H "Authorization: Bearer TOKEN" -H "Accept: application/vnd.littlebits.v2+json" https://api-http.littlebitscloud.cc/devices/DEVICE_ID
```

**Returns** an `Array` of device objects:

    [
        {
            "id": "000001",
            "label": "000001",
            "subscribers": [],
            "subscriptions": [],
            "user_id": "1",
            "wifi": {}
        },
        {
            "id": "000002",
            "label": "000002",
            "subscribers": [],
            "subscriptions": [],
            "user_id": "1",
            "wifi": {}
        }
    ]


## /devices/{device_id}/output
### POST

    ? percent
      | <Int:Range:0-100>       –––– a percent of the maximum current output
      – default: 100

    ? duration_ms:
      | <Int>                   –––– output will be sustained for given milliseconds
                                     – if the duration_ms is `-1` it will last forever or until another output is received by device
      - maximum value: 32000
      - default: 3000 (3 seconds)


```
curl -i -XPOST -H "Authorization: Bearer TOKEN" -H "Accept: application/vnd.littlebits.v2+json" https://api-http.littlebitscloud.cc/devices/DEVICE_ID/output -d percent=50 -d duration_ms=1000
```

**Returns** success:

    {}

or error:

    {
        "code": 403,
        "error": "Forbidden",
        "message": "You do not own this device"
    }
    or
    {
        "code": 404,
        "error": "Not Found",
        "message": "The device {device_id} is not currently connected to the littleBits Cloud."
    }

> #### Examples
>
    The default (used if you do not supply values yourself)
    {"percent":100, "duration_ms":3000}
>
    output at 75% power for one second
    {"percent":75, "duration_ms":1000}
>
    half output forever (subequent "output" requests would overwrite this)
    {"percent":50, "duration_ms":-1}

## /subscriptions
### GET

    ? subscriber_id
      | <String>       –––– list subscriptions where given device [or callback uri] is a subscriber

    ? publisher_id
      | <String>       –––– list subscriptions where given device is a pubisher

**Returns** an `Array` of subscription objects:

    [
        {
            "publisher_events": [
                "amplitude"
            ],
            "publisher_id": "000001",
            "subscriber_id": "000002"
        },
        {
            "publisher_events": [
                "amplitude:delta:ignite"
            ],
            "publisher_id": "000001",
            "subscriber_id": "http://some.callback.com?params=stuff"
        }
    ]


### DELETE

    ! subscriber_id: <Str:URI|id> –– callback URI or device id of subscriber
    ! publisher_id:  <Str:id>     –– device id of publisher


**Returns** a somewhat obscure success message:

    [
        1,
        1,
        1
    ]


### POST

    ! subscriber_id: <Str:URI|id> –– callback URI or device id of subscriber
    ! publisher_id:  <Str:id>     –– device id of publisher
    ? publisher_events: [<Event>] –– Channels to subscribe to
                                   - Default: ['amplitude:delta:ignite']


Notes:

Each channel is POSTed to individually. For example if a client were to include "connection" and "amplitude" channels in their subscription they could receive POSTs for either channel but never a single POST for both channels simultaneously

Payload sent to subscriber_id:
    {"device_id":<Str>, "user_id":<Int>, "timestamp":<Int>, "type":"amplitude", "payload":<Amplitude>}

**Returns** a summary of what was just POSTed:

    {
        "publisher_events": [
            "amplitude"
        ],
        "publisher_id": "000001",
        "subscriber_id": "000002"
    }


> #### `subscriber_id` field details
    If subscriber_id is callback URI:
>
    - it MUST respond with HTTP 200 within 15s
>
    - For any other response (including 15s timeout) littleBits Cloud
       will exponentially backoff 8 times until finally deleting
       the subscription (note: not banned, it may re-subscribe)
>
    - If the endpoint resumes on any step the fail counter is reset
>
      Exponential backoff
      --------------------
      Fail count:    1   2   3  4   5  6  7  8
      Retry in  :    10s 30s 1m 10m 1h 1d 1w Deleted

> #### `publisher_events` field details
>
>>  The following lists all available channels
>>
    amplitude                  –––– when there is any voltage (catch-all, default)
    amplitude:delta:sustain    –––– when high voltage is constant (eg button being held)
    amplitude:delta:ignite     –––– when there is significant voltage jump (eg button press)
    amplitude:delta:release    –––– when there is significant voltage drop (eg button release)
    amplitude:delta:nap        –––– when low voltage is constant (eg idle bitSnap system)
    amplitude:level:active     –––– generic, when there is high voltage (eg during a sustain or maybe just ignited)
    amplitude:level:idle       –––– generic, when there is low voltage (eg during a long nap or maybe just released)
>>
  You may subscribe to multiple channels, e.g.:
>>
    publisher_events: ['amplitude:delta:release', 'amplitude:delta:ignite']
>>


#### Examples
All Examples pertain to this scenario:
```
Client subscribes... (Substitute "..." with examples below)
> POST
  uri: https://api-http.littlebitscloud.cc/devices/subscriptions
  payload: { publisher_id: '000001', subscriber_id: 'http://foo.com/bar', publisher_events: ... }

When events occur, Cloud publishes... (substitute "..." with examples below)
> POST
  uri: http://foo.com/bar
  payload: ...
```
```
client.payload.publisher_events = ['amplitude']

POSTed to subscriber:
{ device_id:"000001", user_id:<Int>, timestamp:<Int>, type:"amplitude", payload: {absolute:*, percent:*, delta:*, level:*}}
```
```
client.payload.publisher_events = ['amplitude:delta:ignite']

POSTed to subscriber:
{ device_id:"000001", user_id:<Int>, timestamp:<Int>, type:'amplitude', payload: {absolute:*, percent:*, delta:'ignite', level:*}}
```
```
client.payload.publisher_events = ['amplitude:delta:ignite', 'amplitude:delta:sustain']

POSTed to subscriber:
{ device_id:"000001", user_id:<Int>, timestamp:<Int>, type:'amplitude', payload: {absolute:*, percent:*,  delta:'sustain'|'ignite', level:*}}
```



## Object Schemas

##### `device`

    id:            <Str>
    user_id:       <Int>             ––––   Code that identifies the owner (littleBits user).
    label:         <Str>             ––––   User-chosen label, unique among the user's bits.
    subscribers:   [<Str:URI>]       ––––   Clients subscribed to this bit
    subscriptions: [<Str:URI>]       ––––   Clients this bit is subscribed to

##### `amplitude`

    percent:      <Float:0-100>
    delta:        <Str:('nap'|'release'|'ignite'|'sustain')>



## Resources

- [auth docs](/api-http/auth)
- [auth implementation docs](/api-http/auth-implementation)
