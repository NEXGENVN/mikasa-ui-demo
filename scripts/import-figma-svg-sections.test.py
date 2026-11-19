import importlib.util
import pathlib
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('svg_importer', HERE/'import-figma-svg-sections.py')
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


def tree(body):
    return M.ET.ElementTree(M.ET.fromstring(('<svg xmlns="'+M.SVG+'" xmlns:xlink="'+M.XLINK+'">'+body+'</svg>').encode()))


class ExtractionIntegrityTests(unittest.TestCase):
    def test_rect_bounds_preserve_affine_position(self):
        node = M.ET.fromstring(b'<rect x="5" y="7" width="10" height="20" transform="translate(100 200)"/>')
        self.assertEqual(M.rect_bounds(node),(105,207,10,20))
        self.assertEqual(M.rect_bounds(node,'scale(2)'),(210,414,20,40))

    def test_native_inherited_transform_returns_board_local_coordinates(self):
        board=(1,0,0,1,-5091,2849)
        child_global=(1,0,0,1,-3787,3069)
        self.assertEqual(M.multiply(M.inverse(board),child_global),(1,0,0,1,1304,220))
        scaled_rotated=(0,2,-2,0,5,7)
        self.assertEqual(M.multiply(M.inverse(scaled_rotated),scaled_rotated),(1,0,0,1,0,0))

    def test_only_exact_page_dimensions_are_candidates(self):
        self.assertTrue(M.is_page((0,0,1440,1024),'web'))
        self.assertTrue(M.is_page((0,0,999,1440),'web-portrait'))
        self.assertFalse(M.is_page((0,0,1050,1018),'web'))
        self.assertTrue(M.is_page((0,0,390,1199),'app'))
        self.assertFalse(M.is_page((0,0,389,843),'app'))

    def test_static_figma_blur_survives_whitelist(self):
        value = tree('<foreignObject x="1" y="2" width="3" height="4"><div xmlns="http://www.w3.org/1999/xhtml" style="backdrop-filter:blur(10px);clip-path:url(#local_clip);height:100%;width:100%"/></foreignObject>')
        self.assertEqual(M.safety_check(value),{})

    def test_active_content_and_external_resources_are_rejected(self):
        for body in ['<script>alert(1)</script>', '<rect onclick="alert(1)"/>', '<image xlink:href="https://example.com/a.png"/>', '<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml"/></foreignObject>', '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml" style="background:url(https://example.com/a)"/></foreignObject>']:
            with self.subTest(body=body):
                self.assertTrue(M.safety_check(tree(body)))

    def test_reference_closure_includes_transitive_defs(self):
        value = tree('<defs><linearGradient id="first" xlink:href="#second"/><linearGradient id="second"/><filter id="unused"/></defs><path fill="url(#first)"/>').getroot()
        ids = {n.get('id'):n for n in value.iter() if n.get('id')}
        defs,missing=M.collect_definitions([value[-1]],ids)
        self.assertEqual({n.get('id') for n in defs},{'first','second'})
        self.assertEqual(missing,[])

    def test_missing_reference_is_explicit(self):
        value = tree('<path clip-path="url(#missing)"/>').getroot()
        _,missing=M.collect_definitions(list(value),{})
        self.assertEqual(missing,['missing'])

    def test_original_image_bytes_are_preserved(self):
        import base64,hashlib
        payload=b'original-source-image-bytes'
        value=tree('<image id="source" xlink:href="data:image/png;base64,'+base64.b64encode(payload).decode()+'"/>').getroot()
        with tempfile.TemporaryDirectory() as directory:
            output=pathlib.Path(directory);(output/'assets').mkdir()
            assets=M.image_assets(value,output)
            self.assertEqual((output/assets[0]['file']).read_bytes(),payload)
            self.assertEqual(assets[0]['sha256'],hashlib.sha256(payload).hexdigest())
            self.assertTrue(value[0].get('{'+M.XLINK+'}href').startswith('../assets/'))


if __name__=='__main__':
    unittest.main()
