var r = require('reactjs/react-bower:react-with-addons.js')
var { List } = require('facebook/immutable-js@3.1.0:dist/immutable.js')
var { ELEM } = require('../utils')



var e = r.DOM



module.exports = ELEM('route-params-body', 'section', function(props){
  var params = props.route.getIn(['meta', 'bodyParams'], List())
  if (!params.size) return null
  return e.
  div(null,
    e.h2({ className: 'fontSubTitle' }, 'Parameters'),
    e.ul({ className: 'params' },
      params.map(function(param) {
        return e.
        li({ className: 'param' },
          e.div({ className: 'param-name-col' },
            e.span({ className: 'param-name fontCode' }, param.get('name'))
          ),
          //e.span(null, param.get('type')),
          //e.span(null, param.get('required').toString()),
          e.p({ className: 'param-summary-col' }, param.get('summary'))
        )
      }).toJS()
    )
  )
})
