//Taken from
//https://github.com/pydicom/pydicom/blob/master/pydicom/pixel_data_handlers/rle_handler.py

export class Decoder {

    /*

    """Decodes a single frame of RLE encoded data.
    Reads the plane information at the beginning of the data.
    If more than pixel size > 1 byte appropriately interleaves the data from
    the high and low planes. Data is always stored big endian. Output always
    little endian

    Parameters
    ----------
    data: bytes
        The RLE frame data
    rows: int
        The number of output rows
    columns: int
        The number of output columns
    samples_per_pixel: int
        Number of samples per pixel (e.g. 3 for RGB data).
    bits_allocated: int
        Number of bits per sample - must be a multiple of 8

    Returns
    -------
    bytearray
        The decompressed data
    """


    Data is off type TypedArray

    */
    decodeFrame(data, rows, columns, samples_per_pixel, bits_allocated) {
        let rle_start = 0
        let rle_len = data.length

        let number_of_planes = new DataView(data.slice(rle_start, rle_start + 4).reverse().buffer).getUint32()

        if(bits_allocated % 8 != 0)
            throw("Don't know how to handle BitsAllocated not being a multiple of bytes")

        let bytes_allocated = Math.floor(bits_allocated / 8)

        let expected_number_of_planes = samples_per_pixel * bytes_allocated

        if (number_of_planes != expected_number_of_planes)
            throw("Unexpected number of planes")

        let plane_start_list = []
        for(let i = 0; i < number_of_planes; i++)
        {
            let header_offset_start = rle_start + 4 + (4 * i)
            let header_offset_end = rle_start + 4 + (4 * (i + 1))
            let plane_start_in_rle = new DataView(data.slice(header_offset_start, header_offset_end).reverse().buffer).getUint32() // noqa
            plane_start_list.push(plane_start_in_rle + rle_start)
        }
            

        let plane_end_list = plane_start_list.slice(1)
        plane_end_list.push(rle_len + rle_start)

        let frame_bytes = new Uint8Array(rows * columns * samples_per_pixel * bytes_allocated)  // noqa

        for (let sample_number = 0; sample_number < samples_per_pixel; sample_number++)
            for (let byte_number =0; byte_number < bytes_allocated; byte_number++)
            {
                let plane_number = byte_number + (sample_number * bytes_allocated)
                let out_plane_number = ((sample_number + 1) * bytes_allocated) - byte_number - 1  // noqa
                let plane_start = plane_start_list[plane_number]
                let plane_end = plane_end_list[plane_number]

                let plane_bytes = this._rle_decode_plane(data.slice(plane_start,plane_end))

                if (plane_bytes.length != (rows * columns))
                    throw("Different number of bytes unpacked from RLE than expected")

                let increment = samples_per_pixel * bytes_allocated;
                for(let k = out_plane_number,m = 0; k < frame_bytes.length;k+=increment,m++)
                    frame_bytes[k] = plane_bytes[m]  // noqa
            }
                

        return frame_bytes
    }


    _rle_decode_plane(data) {
    /*
    Return a single plane of decoded RLE data.

    Parameters
    ----------
    data : bytes
        The data to be decompressed.

    Returns
    -------
    bytearray
        The decompressed data.
    */

        let result = []
        let pos = 0
        let len_data = data.length

        while (pos < len_data)
        {
            let header_byte = data[pos]
            pos += 1
            if (header_byte > 128)
            {
                // Extend by copying the next byte (-N + 1) times
                // however since using uint8 instead of int8 this will be
                // (256 - N + 1) times
                let copyTimes = (257 - header_byte);
                let dataCopy = data.slice(pos,pos+1) 
                for(let i = 0; i< copyTimes;i++)
                    for(let j = 0; j < dataCopy.length;j++)
                        result.push(dataCopy[j])
                pos += 1
                continue
            }
                

            if (header_byte < 128)
            {
                //Extend by literally copying the next (N + 1) bytes
                let dataCopy = data.slice(pos,pos + header_byte + 1)
                for(let j = 0; j < dataCopy.length;j++)
                    result.push(dataCopy[j])

                pos += header_byte + 1
            }
        }

        return result
    }
}