"""The single documented list of inputs nothing in this repo can regenerate (AC9).

Paths are relative to the data dir (``pipeline/``, or ``$SQUAT_ROOT``). Hashes were
taken with ``sha256sum`` on the committed files; tests/test_inputs.py checks them.
"""

FIXED_INPUTS = {
    'v3/base.html': '00a6adcb33aec55f1d474675e5027648700332ab4214ac6cf6375c6cbd4d8e33',
    'T_global.npy': '56839e4e1efbfbfcf623181cbfa21c5716b1718ab0b9baf614cdc2abf3611bc6',
    'v3/bar_seat.npy': '0a796e66499aa25907acb631ef6236a252ef7cac4d540f493caa96d19f2ba466',
    'v3/girdle_p.npy': 'd71a0bd351b2b76511d55864ecf13ce4c88ab7e691295ce2299bd3137890a9fe',
    'v3/curve_alpha.npy': '6286920158aaf308e7ab6d90d4efc75be5c598b8bb5c00bf05b461cba9750939',
    'v3/curve_ends.npy': '9b1d96ad90bcca57e3d6c6a96ebf72fa00886bb4b4bae10548ffadb91b846808',
    'v3/st_W.npy': '38776b3f857054cece4458230d6753b3a36ad00f111db8556e42e7dc996821f0',
    'v3/armik2_x.npy': 'f2b0713bee692dc9e95910113e1e757844db993a84b99639d42a35a71ddb3c20',
    'v3/Tcur.npy': 'f8930ff94c27438df677f5e045adbcf95ad9512babac6080a08b722be1e5efea',
}

FIXED_NOTES = {
    'v3/base.html': 'the v2 page; carries v1 data whose generator is lost (ARCHIVE.md)',
    'v3/armik2_x.npy': 'IK seed; its generator (run_ik2.py) is in the preserve bundle and does not run as is',
    'v3/Tcur.npy': 'regenerable only through the regcur stage, with T_arm_all.npy from the preserve bundle',
}

# Read by every stage that builds the arm (armik.py:12,15, armik2.py:4): balance3, phase3, upper3, build.
STL_BUILD = ('FMA23130', 'FMA23464', 'FMA23467', 'FMA24468', 'FMA24446', 'FMA24437')
# Read only by upper3 (upper3.py:23,28-29), on top of STL_BUILD.
STL_UPPER = ('FMA13322', 'FMA13395', 'FMA34680', 'FMA34682', 'FMA34684', 'FMA34690', 'FMA79979', 'FMA45874')

STL_SHA256 = {
    'FMA13322': 'f340050375ea4397a85082fb7bd68ea553d52f4718656599804ecf8f4c7768be',
    'FMA13395': 'c0a3afd469db1fec9527bb81ec1f0956876d3d64d3acbf3a083619d4e7ce297b',
    'FMA23130': '6e26ad2b9794b136000abe2cc0b54cade989b943214e2149732cc2db2e337dce',
    'FMA23464': '23eed49ade9f558406782b47decee325d12ee9e1d5ef661a051a0516a142dfa3',
    'FMA23467': 'c6074d69a2ccbcef6db2fb8bf758b44a5f6438b035da3399d6efb41b9d759a03',
    'FMA24437': '4b35077cf6a5711e1dfdd39a07734d792f0c84ce19b3b8cc942e2ad4838ef8ea',
    'FMA24446': '4f717f2fba9b0cb432da64921d7aeaab2709d97129f39b6538c6ea147e68977d',
    'FMA24468': 'f8d96b418c20308dc76868621875a3b029f9d6f072621efa37045dceb2730d5e',
    'FMA34680': '89f2568231a3f44d4de8119e8d3a5de8303ce18b607338be448e4de9169fcb9e',
    'FMA34682': '1d261c2d378ca98a352dca1511bb1c2aa005a0a4309b9f9998d23d8397d80d0b',
    'FMA34684': '685c2c3b8e24b7a31e2274749b5306d96880420feb035ea4ecce5fb2d0993ac0',
    'FMA34690': '1725833b2da2e72bd64322c256e81910eae9fb9490ee721fd82910ae2eaed921',
    'FMA45874': '130109f109bac097eb5c710b7e34cb9e7ffa1ac0f88a76182fe8795ba19b2056',
    'FMA79979': '50cec276c3919d5c8857e789852a0e7cfe2c3d789bfd52334e4dc37849079915',
}

# The BodyParts3D commit the STLs above were fetched from (git -C pipeline/ext/bp3d rev-parse HEAD).
# scripts/fetch_stl.sh pins the same commit; keep the two in step.
BP3D_COMMIT = 'f0eeb6e843380cfe6b83797cf8c3e1af74de5e61'
