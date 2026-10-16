import test from 'node:test';
import assert from 'node:assert/strict';
import {assignmentMarkup,assignmentReportText} from '../dist/assignment-ui.mjs';

test('document review preserves safe feedback sources without duplicating registered material cards',()=>{
 const a={documents:[{name:'피드백<script>.txt',role:'feedback',text:'Hunyuan3D 대신 고려하세요. <script>alert(1)</script>',locations:[],warnings:['<img src=x onerror=alert(1)>']}]};
 const html=assignmentMarkup(a);
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img '));
 assert.match(html,/&lt;script&gt;/);assert.match(html,/피드백/);
 assert.ok(!html.includes('data-assignment-candidate'));
 assert.match(assignmentReportText(a),/Hunyuan3D/);
 assert.match(assignmentReportText(a),/피드백·대안 포함/);
 assert.equal(assignmentReportText(undefined),'');
});
