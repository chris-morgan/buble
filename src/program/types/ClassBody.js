import Node from '../Node.js';

// TODO this code is pretty wild, tidy it up
export default class ClassBody extends Node {
	transpile ( code, inFunctionExpression ) {
		const name = this.parent.name;
		const superName = this.parent.superClass && this.parent.superClass.name;

		const indentStr = code.getIndentString();
		let indentation = this.getIndentation();

		const constructorIndex = this.body.findIndex( node => node.kind === 'constructor' );
		const constructor = this.body[ constructorIndex ];

		// if ( constructorIndex > 0 ) {
		// 	code.remove( this.body[ constructorIndex - 1 ].end, constructor.start );
		// }

		const methods = this.body.filter( node => node.kind !== 'constructor' );

		this.insertAtStart( `function ${name} ` );
		if ( constructor ) {
			code.remove( constructor.start, constructor.value.start );
			constructor.value.moveTo( this.start );
		} else {
			let body = superName ?
				`() {\n${indentation}${indentStr}${indentStr}${superName}.apply(this, arguments);\n${indentation}${indentStr}}` :
				`() {}`;

			this.insertAtStart( body );
		}

		if ( !inFunctionExpression ) this.insertAtStart( ';' );

		if ( superName || methods.length ) this.insertAtStart( `\n\n${indentation}` );

		if ( this.parent.superClass ) {
			this.insertAtStart( `${indentStr}${name}.prototype = Object.create( ${superName} && ${superName}.prototype );\n${indentation + indentStr}${name}.prototype.constructor = ${name};` );
			if ( !constructor ) this.insertAtStart( `\n\n${indentation + indentStr}` );
		}

		methods.forEach( method => {
			if ( method.static ) code.remove( method.start, method.start + 7 );

			const lhs = method.static ?
				`${name}.${method.key.name}` :
				`${name}.prototype.${method.key.name}`;

			method.insertAtStart( `${lhs} = function ` );
			method.insertAtEnd( ';' );

			// prevent function name shadowing an existing declaration
			const scope = this.findScope( false );
			if ( scope.contains( method.key.name ) ) {
				method.key.replaceWith( scope.createIdentifier( method.key.name ), true );
			}
		});

		if ( this.body.length ) {
			code.remove( this.start, this.body[0].start );
			code.remove( this.body[ this.body.length - 1 ].end, this.end );
		} else {
			this.remove();
		}

		super.transpile( code );
	}
}